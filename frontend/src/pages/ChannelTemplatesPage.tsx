import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileBox, Plus, Trash2, Edit, Copy, Download, Globe, Lock } from 'lucide-react'
import {
  getChannelTemplates,
  createChannelTemplate,
  updateChannelTemplate,
  deleteChannelTemplate,
  applyChannelTemplate,
  createTemplateFromChannel,
  type ChannelTemplate,
  type CreateChannelTemplateRequest,
} from '@/services/channelTemplateService'
import { channelsService } from '@/services/irc'
import { Button, Input, Modal, Badge, Select } from '@/components/common'
import type { IRCChannel } from '@/types'

export function ChannelTemplatesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [showFromChannelModal, setShowFromChannelModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ChannelTemplate | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ChannelTemplate | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [modes, setModes] = useState('')
  const [topic, setTopic] = useState('')
  const [isGlobal, setIsGlobal] = useState(false)

  // Apply state
  const [targetChannel, setTargetChannel] = useState('')

  // From channel state
  const [sourceChannel, setSourceChannel] = useState('')
  const [newTemplateName, setNewTemplateName] = useState('')

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['channelTemplates'],
    queryFn: () => getChannelTemplates(),
  })

  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelsService.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: createChannelTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channelTemplates'] })
      resetForm()
      setShowCreateModal(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateChannelTemplate>[1] }) =>
      updateChannelTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channelTemplates'] })
      resetForm()
      setEditingTemplate(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteChannelTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channelTemplates'] })
    },
  })

  const applyMutation = useMutation({
    mutationFn: ({ id, channel }: { id: number; channel: string }) => applyChannelTemplate(id, channel),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['channelTemplates'] })
      setShowApplyModal(false)
      setSelectedTemplate(null)
      setTargetChannel('')
      alert(`Template applied!\nSuccess: ${data.success.join(', ') || 'None'}\nErrors: ${data.errors.join(', ') || 'None'}`)
    },
  })

  const fromChannelMutation = useMutation({
    mutationFn: ({ channel, name }: { channel: string; name: string }) => createTemplateFromChannel(channel, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channelTemplates'] })
      setShowFromChannelModal(false)
      setSourceChannel('')
      setNewTemplateName('')
    },
  })

  const resetForm = () => {
    setName('')
    setDescription('')
    setModes('')
    setTopic('')
    setIsGlobal(false)
  }

  const openEditModal = (template: ChannelTemplate) => {
    setEditingTemplate(template)
    setName(template.name)
    setDescription(template.description)
    setModes(template.modes)
    setTopic(template.topic)
    setIsGlobal(template.is_global)
  }

  const openApplyModal = (template: ChannelTemplate) => {
    setSelectedTemplate(template)
    setTargetChannel('')
    setShowApplyModal(true)
  }

  const handleSubmit = () => {
    const data: CreateChannelTemplateRequest = {
      name,
      description,
      modes,
      topic,
      is_global: isGlobal,
    }

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const duplicateTemplate = (template: ChannelTemplate) => {
    setName(`${template.name} (Copy)`)
    setDescription(template.description)
    setModes(template.modes)
    setTopic(template.topic)
    setIsGlobal(false)
    setShowCreateModal(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileBox className="text-[var(--accent)]" size={24} />
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Channel Templates</h1>
            <p className="text-sm text-[var(--text-secondary)]">Save and apply channel configurations as reusable templates</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowFromChannelModal(true)}>
            <Download size={16} className="mr-2" />
            From Channel
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={16} className="mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.length === 0 ? (
          <div className="col-span-full p-8 text-center text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            No channel templates yet. Create one or import from an existing channel.
          </div>
        ) : (
          templates.map((template: ChannelTemplate) => (
            <div key={template.id} className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileBox size={20} className="text-[var(--accent)]" />
                  <span className="font-medium text-[var(--text-primary)]">{template.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {template.is_global ? (
                    <span title="Global template"><Globe size={14} className="text-[var(--accent)]" /></span>
                  ) : (
                    <span title="Private template"><Lock size={14} className="text-[var(--text-secondary)]" /></span>
                  )}
                </div>
              </div>

              {template.description && (
                <p className="text-sm text-[var(--text-secondary)] mb-3">{template.description}</p>
              )}

              <div className="space-y-2 text-sm">
                {template.modes && (
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-secondary)]">Modes:</span>
                    <Badge variant="secondary">{template.modes}</Badge>
                  </div>
                )}
                {template.topic && (
                  <div>
                    <span className="text-[var(--text-secondary)]">Topic:</span>
                    <p className="text-[var(--text-primary)] truncate">{template.topic}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-primary)]">
                <span className="text-xs text-[var(--text-secondary)]">
                  Used {template.use_count} times • by {template.created_by_username}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openApplyModal(template)} title="Apply to channel">
                    <Download size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => duplicateTemplate(template)} title="Duplicate">
                    <Copy size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(template)} title="Edit">
                    <Edit size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this template?')) {
                        deleteMutation.mutate(template.id)
                      }
                    }}
                    title="Delete"
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || editingTemplate !== null}
        onClose={() => {
          setShowCreateModal(false)
          setEditingTemplate(null)
          resetForm()
        }}
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Modes</label>
            <Input value={modes} onChange={(e) => setModes(e.target.value)} placeholder="+nts" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Topic</label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Channel topic" />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isGlobal"
              checked={isGlobal}
              onChange={(e) => setIsGlobal(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isGlobal" className="text-sm text-[var(--text-secondary)]">
              Make this template available to all users
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateModal(false)
                setEditingTemplate(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!name}>
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Apply Modal */}
      <Modal isOpen={showApplyModal} onClose={() => setShowApplyModal(false)} title={t('channelTemplates.applyModal.title')}>
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            {t('channelTemplates.applyModal.subtitle', { name: selectedTemplate?.name })}
          </p>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('channelTemplates.form.targetChannel')}</label>
            <Select value={targetChannel} onChange={(e) => setTargetChannel(e.target.value)}>
              <option value="">{t('channelTemplates.placeholders.selectChannel')}</option>
              {channels.map((ch: IRCChannel) => (
                <option key={ch.name} value={ch.name}>
                  {ch.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowApplyModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (selectedTemplate && targetChannel) {
                  applyMutation.mutate({ id: selectedTemplate.id, channel: targetChannel })
                }
              }}
              disabled={!targetChannel || applyMutation.isPending}
            >
              {t('channelTemplates.applyModal.applyButton')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* From Channel Modal */}
      <Modal isOpen={showFromChannelModal} onClose={() => setShowFromChannelModal(false)} title="Create from Channel">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Create a new template from an existing channel's configuration:
          </p>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Source Channel</label>
            <Select value={sourceChannel} onChange={(e) => setSourceChannel(e.target.value)}>
              <option value="">Select a channel...</option>
              {channels.map((ch: IRCChannel) => (
                <option key={ch.name} value={ch.name}>
                  {ch.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Template Name</label>
            <Input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Name for the new template"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowFromChannelModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (sourceChannel && newTemplateName) {
                  fromChannelMutation.mutate({ channel: sourceChannel, name: newTemplateName })
                }
              }}
              disabled={!sourceChannel || !newTemplateName || fromChannelMutation.isPending}
            >
              Create Template
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
