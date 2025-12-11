package sse

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// Event represents a Server-Sent Event
type Event struct {
	ID    string      `json:"id,omitempty"`
	Event string      `json:"event,omitempty"`
	Data  interface{} `json:"data"`
	Retry int         `json:"retry,omitempty"`
}

// Client represents an SSE client connection
type Client struct {
	ID       string
	Channel  chan Event
	Done     chan struct{}
	LastPing time.Time
}

// Broker manages SSE connections
type Broker struct {
	clients    map[string]*Client
	register   chan *Client
	unregister chan *Client
	broadcast  chan Event
	mu         sync.RWMutex
}

var (
	broker     *Broker
	brokerOnce sync.Once
)

// GetBroker returns the singleton SSE broker
func GetBroker() *Broker {
	brokerOnce.Do(func() {
		broker = &Broker{
			clients:    make(map[string]*Client),
			register:   make(chan *Client),
			unregister: make(chan *Client),
			broadcast:  make(chan Event, 100),
		}
		go broker.run()
	})
	return broker
}

// run handles broker operations
func (b *Broker) run() {
	for {
		select {
		case client := <-b.register:
			b.mu.Lock()
			b.clients[client.ID] = client
			b.mu.Unlock()

		case client := <-b.unregister:
			b.mu.Lock()
			if _, ok := b.clients[client.ID]; ok {
				close(client.Channel)
				delete(b.clients, client.ID)
			}
			b.mu.Unlock()

		case event := <-b.broadcast:
			b.mu.RLock()
			for _, client := range b.clients {
				select {
				case client.Channel <- event:
				default:
					// Client is slow, skip this event
				}
			}
			b.mu.RUnlock()
		}
	}
}

// Register adds a new client
func (b *Broker) Register(client *Client) {
	b.register <- client
}

// Unregister removes a client
func (b *Broker) Unregister(client *Client) {
	b.unregister <- client
}

// Broadcast sends an event to all clients
func (b *Broker) Broadcast(event Event) {
	b.broadcast <- event
}

// ClientCount returns the number of connected clients
func (b *Broker) ClientCount() int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.clients)
}

// NewClient creates a new SSE client
func NewClient(id string) *Client {
	return &Client{
		ID:       id,
		Channel:  make(chan Event, 10),
		Done:     make(chan struct{}),
		LastPing: time.Now(),
	}
}

// ServeSSE sets up SSE headers and streams events
func ServeSSE(c *gin.Context, client *Client) {
	// Set headers for SSE
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("X-Accel-Buffering", "no")

	broker := GetBroker()
	broker.Register(client)

	// Ensure cleanup on disconnect
	defer func() {
		broker.Unregister(client)
		close(client.Done)
	}()

	// Set up a ticker for keepalive pings
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	// Flush helper
	flusher, hasFlusher := c.Writer.(http.Flusher)

	// Send initial connected event immediately
	fmt.Fprintf(c.Writer, "event: connected\ndata: {\"status\":\"connected\"}\n\n")
	if hasFlusher {
		flusher.Flush()
	}

	// Send events
	for {
		select {
		case event, ok := <-client.Channel:
			if !ok {
				return
			}
			writeEvent(c.Writer, event)
			if hasFlusher {
				flusher.Flush()
			}

		case <-ticker.C:
			// Send keepalive comment
			fmt.Fprintf(c.Writer, ": keepalive\n\n")
			if hasFlusher {
				flusher.Flush()
			}

		case <-c.Request.Context().Done():
			return

		case <-client.Done:
			return
		}
	}
}

// writeEvent writes a single SSE event
func writeEvent(w io.Writer, event Event) {
	if event.ID != "" {
		fmt.Fprintf(w, "id: %s\n", event.ID)
	}
	if event.Event != "" {
		fmt.Fprintf(w, "event: %s\n", event.Event)
	}
	if event.Retry > 0 {
		fmt.Fprintf(w, "retry: %d\n", event.Retry)
	}

	data, err := json.Marshal(event.Data)
	if err != nil {
		fmt.Fprintf(w, "data: %v\n\n", event.Data)
	} else {
		fmt.Fprintf(w, "data: %s\n\n", data)
	}
}

// TopicBroker manages topic-based SSE subscriptions
type TopicBroker struct {
	topics map[string]map[string]*Client
	mu     sync.RWMutex
}

var (
	topicBroker     *TopicBroker
	topicBrokerOnce sync.Once
)

// GetTopicBroker returns the singleton topic broker
func GetTopicBroker() *TopicBroker {
	topicBrokerOnce.Do(func() {
		topicBroker = &TopicBroker{
			topics: make(map[string]map[string]*Client),
		}
	})
	return topicBroker
}

// Subscribe subscribes a client to a topic
func (tb *TopicBroker) Subscribe(topic string, client *Client) {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	if _, ok := tb.topics[topic]; !ok {
		tb.topics[topic] = make(map[string]*Client)
	}
	tb.topics[topic][client.ID] = client
}

// Unsubscribe removes a client from a topic
func (tb *TopicBroker) Unsubscribe(topic string, client *Client) {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	if clients, ok := tb.topics[topic]; ok {
		delete(clients, client.ID)
		if len(clients) == 0 {
			delete(tb.topics, topic)
		}
	}
}

// UnsubscribeAll removes a client from all topics
func (tb *TopicBroker) UnsubscribeAll(client *Client) {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	for topic, clients := range tb.topics {
		delete(clients, client.ID)
		if len(clients) == 0 {
			delete(tb.topics, topic)
		}
	}
}

// Publish sends an event to all clients subscribed to a topic
func (tb *TopicBroker) Publish(topic string, event Event) {
	tb.mu.RLock()
	defer tb.mu.RUnlock()

	if clients, ok := tb.topics[topic]; ok {
		for _, client := range clients {
			select {
			case client.Channel <- event:
			default:
				// Client is slow, skip this event
			}
		}
	}
}

// TopicCount returns the number of clients subscribed to a topic
func (tb *TopicBroker) TopicCount(topic string) int {
	tb.mu.RLock()
	defer tb.mu.RUnlock()

	if clients, ok := tb.topics[topic]; ok {
		return len(clients)
	}
	return 0
}
