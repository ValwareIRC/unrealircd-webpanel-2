import { useState } from 'react'
import { usePanelUsers, useCreatePanelUser, useUpdatePanelUser, useDeletePanelUser, useRoles } from '@/hooks'
import { DataTable, Button, Modal, Input, Select, Alert, Badge } from '@/components/common'
import { Plus, Edit, Trash2, Shield, Mail, Clock, User as UserIcon } from 'lucide-react'
import type { User } from '@/types'
import toast from 'react-hot-toast'

export function PanelUsersPage() {
  const { data: users, isLoading, error } = usePanelUsers()
  const { data: roles } = useRoles()
  const createUser = useCreatePanelUser()
  const updateUser = useUpdatePanelUser()
  const deleteUser = useDeletePanelUser()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    bio: '',
    role_id: 0,
  })

  // Helper to format time ago
  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  const columns = [
    {
      key: 'username',
      header: 'Username',
      sortable: true,
      render: (user: User) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--text-primary)] font-semibold text-sm">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="text-[var(--text-primary)] font-medium block">{user.username}</span>
            {(user.first_name || user.last_name) && (
              <span className="text-[var(--text-muted)] text-xs">
                {[user.first_name, user.last_name].filter(Boolean).join(' ')}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (user: User) => (
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Mail size={14} />
          {user.email ? (
            <a href={`mailto:${user.email}`} className="hover:text-[var(--accent)] transition-colors">
              {user.email}
            </a>
          ) : (
            'Not set'
          )}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: User) => (
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-[var(--text-muted)]" />
          <Badge variant={user.role?.is_super_admin ? 'warning' : 'default'}>
            {user.role?.name || 'No role'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (user: User) => (
        <span className="text-[var(--text-muted)] font-mono text-xs">
          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
        </span>
      ),
    },
    {
      key: 'last_login',
      header: 'Last Login',
      render: (user: User) => (
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-[var(--text-muted)]" />
          <div>
            <span className="text-[var(--text-muted)] font-mono text-xs block">
              {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
            </span>
            {user.last_login && (
              <span className="mt-0.5">
                <Badge variant="default" size="sm">
                  {formatTimeAgo(user.last_login)}
                </Badge>
              </span>
            )}
          </div>
        </div>
      ),
    },
  ]

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      email: '',
      first_name: '',
      last_name: '',
      bio: '',
      role_id: roles?.[0]?.id || 0,
    })
  }

  const handleCreate = async () => {
    try {
      await createUser.mutateAsync(formData)
      toast.success('User created successfully')
      setShowAddModal(false)
      resetForm()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create user'
      toast.error(message)
    }
  }

  const handleUpdate = async () => {
    if (!selectedUser) return
    try {
      const updateData = { ...formData, id: selectedUser.id }
      let result: { message: string; password_warning?: string } | undefined
      if (!updateData.password) {
        const { password, ...rest } = updateData
        result = await updateUser.mutateAsync(rest as typeof updateData)
      } else {
        result = await updateUser.mutateAsync(updateData)
      }
      
      // Show password breach warning if present
      if (result?.password_warning) {
        toast.error(result.password_warning, {
          duration: 10000,
          icon: '⚠️',
        })
      }
      
      toast.success('User updated successfully')
      setShowEditModal(false)
      setSelectedUser(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update user'
      toast.error(message)
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return
    try {
      await deleteUser.mutateAsync(selectedUser.id)
      toast.success('User deleted')
      setShowDeleteModal(false)
      setSelectedUser(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete user'
      toast.error(message)
    }
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      password: '',
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      bio: user.bio || '',
      role_id: user.role_id,
    })
    setShowEditModal(true)
  }

  if (error) {
    return (
      <Alert type="error">
        Failed to load users: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Panel Users</h1>
          <p className="text-[var(--text-muted)] mt-1">Manage users who can access this panel</p>
        </div>
        <Button
          leftIcon={<Plus size={18} />}
          onClick={() => {
            resetForm()
            setShowAddModal(true)
          }}
        >
          Add User
        </Button>
      </div>

      {/* User Count Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent)]/20">
              <UserIcon size={20} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{users?.length || 0}</p>
              <p className="text-sm text-[var(--text-muted)]">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Shield size={20} className="text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {users?.filter(u => u.role?.is_super_admin).length || 0}
              </p>
              <p className="text-sm text-[var(--text-muted)]">Super Admins</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Clock size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {users?.filter(u => {
                  if (!u.last_login) return false
                  const lastLogin = new Date(u.last_login)
                  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
                  return lastLogin > dayAgo
                }).length || 0}
              </p>
              <p className="text-sm text-[var(--text-muted)]">Active (24h)</p>
            </div>
          </div>
        </div>
      </div>

      <DataTable
        data={users || []}
        columns={columns}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder="Search users..."
        actions={(user) => (
          <>
            <Button variant="ghost" size="sm" onClick={() => openEditModal(user)}>
              <Edit size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300"
              onClick={() => {
                setSelectedUser(user)
                setShowDeleteModal(true)
              }}
            >
              <Trash2 size={16} />
            </Button>
          </>
        )}
      />

      {/* Add User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Panel User"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={createUser.isPending}>
              Create User
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="Enter username"
            required
          />
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Enter password"
            required
          />
          <Input
            label="Email (optional)"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="user@example.com"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="First name"
            />
            <Input
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Last name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Bio / Info
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Brief description or notes about this user"
              rows={3}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
            />
          </div>
          <Select
            label="Role"
            value={formData.role_id}
            onChange={(e) => setFormData({ ...formData, role_id: parseInt(e.target.value) })}
          >
            <option value={0}>Select a role</option>
            {roles?.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name} {role.is_super_admin && '(Super Admin)'}
              </option>
            ))}
          </Select>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit User: ${selectedUser?.username}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} isLoading={updateUser.isPending}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="Enter username"
            disabled
            helperText="Username cannot be changed"
          />
          <Input
            label="Password (leave blank to keep current)"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Enter new password"
            helperText="Only fill this if you want to change the password"
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="user@example.com"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="First name"
            />
            <Input
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Last name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Bio / Info
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Brief description or notes about this user"
              rows={3}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
            />
          </div>
          <Select
            label="Role"
            value={formData.role_id}
            onChange={(e) => setFormData({ ...formData, role_id: parseInt(e.target.value) })}
          >
            {roles?.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name} {role.is_super_admin && '(Super Admin)'}
              </option>
            ))}
          </Select>
        </div>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete User"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={deleteUser.isPending}>
              Delete User
            </Button>
          </>
        }
      >
        <Alert type="error">
          Are you sure you want to delete the user <strong>{selectedUser?.username}</strong>?
          This action cannot be undone.
        </Alert>
      </Modal>
    </div>
  )
}
