import { useState } from 'react'
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole, usePermissions } from '@/hooks'
import { DataTable, Button, Modal, Input, Alert, Badge, Select } from '@/components/common'
import { Plus, Edit, Trash2, Shield, Copy, Info } from 'lucide-react'
import type { Role } from '@/types'
import toast from 'react-hot-toast'

export function RolesPage() {
  const { data: roles, isLoading, error } = useRoles()
  const { data: permissions } = usePermissions()
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const deleteRole = useDeleteRole()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [duplicateFromRole, setDuplicateFromRole] = useState<string>('')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_super_admin: false,
    permissions: [] as string[],
  })

  const columns = [
    {
      key: 'name',
      header: 'Role',
      sortable: true,
      render: (role: Role) => (
        <div className="flex items-center gap-2">
          <Shield size={16} className={role.is_super_admin ? 'text-yellow-400' : 'text-[var(--text-muted)]'} />
          <span className="text-[var(--text-primary)] font-medium">{role.name}</span>
          {role.is_super_admin && (
            <Badge variant="warning" size="sm">Super Admin</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (role: Role) => (
        <span className="text-[var(--text-muted)]">{role.description || 'No description'}</span>
      ),
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (role: Role) => (
        <span className="text-[var(--text-muted)]">
          {role.is_super_admin ? (
            <Badge variant="warning">All Permissions</Badge>
          ) : (
            <Badge variant="default">{role.permissions?.length || 0} permissions</Badge>
          )}
        </span>
      ),
    },
  ]

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_super_admin: false,
      permissions: [],
    })
    setDuplicateFromRole('')
  }

  const handleDuplicateFromChange = (roleId: string) => {
    setDuplicateFromRole(roleId)
    if (roleId) {
      const sourceRole = roles?.find(r => r.id.toString() === roleId)
      if (sourceRole) {
        setFormData({
          ...formData,
          is_super_admin: sourceRole.is_super_admin,
          permissions: sourceRole.permissions?.map((p) => p.name || p.permission || '') || [],
        })
      }
    }
  }

  const handleCreate = async () => {
    try {
      await createRole.mutateAsync(formData)
      toast.success('Role created successfully')
      setShowAddModal(false)
      resetForm()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create role'
      toast.error(message)
    }
  }

  const handleUpdate = async () => {
    if (!selectedRole) return
    try {
      await updateRole.mutateAsync({ id: selectedRole.id, ...formData })
      toast.success('Role updated successfully')
      setShowEditModal(false)
      setSelectedRole(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update role'
      toast.error(message)
    }
  }

  const handleDelete = async () => {
    if (!selectedRole) return
    try {
      await deleteRole.mutateAsync(selectedRole.id)
      toast.success('Role deleted')
      setShowDeleteModal(false)
      setSelectedRole(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete role'
      toast.error(message)
    }
  }

  const openEditModal = (role: Role) => {
    setSelectedRole(role)
    setFormData({
      name: role.name,
      description: role.description || '',
      is_super_admin: role.is_super_admin,
      permissions: role.permissions?.map((p) => p.name || p.permission || '') || [],
    })
    setShowEditModal(true)
  }

  const togglePermission = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }))
  }

  if (error) {
    return (
      <Alert type="error">
        Failed to load roles: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Roles & Permissions</h1>
          <p className="text-[var(--text-muted)] mt-1">Manage user roles and their access permissions</p>
        </div>
        <Button
          leftIcon={<Plus size={18} />}
          onClick={() => {
            resetForm()
            setShowAddModal(true)
          }}
        >
          Add Role
        </Button>
      </div>

      {/* Info Card */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-[var(--info)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[var(--text-secondary)] text-sm">
              Roles are user categories where each has its own set of permissions. 
              Create roles to ensure your team has appropriate access levels.
            </p>
            <p className="text-[var(--text-muted)] text-xs mt-1 italic">
              Some roles like "Super Admin" and "Read Only" are built-in and have special behavior.
            </p>
          </div>
        </div>
      </div>

      <DataTable
        data={roles || []}
        columns={columns}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder="Search roles..."
        actions={(role) => (
          <>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                resetForm()
                setFormData({
                  name: `${role.name} (copy)`,
                  description: role.description || '',
                  is_super_admin: role.is_super_admin,
                  permissions: role.permissions?.map((p) => p.name || p.permission || '') || [],
                })
                setShowAddModal(true)
              }}
              title="Duplicate Role"
            >
              <Copy size={16} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openEditModal(role)}>
              <Edit size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300"
              onClick={() => {
                setSelectedRole(role)
                setShowDeleteModal(true)
              }}
            >
              <Trash2 size={16} />
            </Button>
          </>
        )}
      />

      {/* Add Role Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create New Role"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={createRole.isPending}>
              Create Role
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Role Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Moderator"
            required
          />
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of this role"
          />
          
          {/* Duplicate from existing role */}
          {roles && roles.length > 0 && (
            <Select
              label="Copy permissions from existing role (optional)"
              value={duplicateFromRole}
              onChange={(e) => handleDuplicateFromChange(e.target.value)}
            >
              <option value="">None - start fresh</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} ({role.permissions?.length || 0} permissions)
                </option>
              ))}
            </Select>
          )}
          
          <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_super_admin}
                onChange={(e) =>
                  setFormData({ ...formData, is_super_admin: e.target.checked })
                }
                className="rounded border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <div>
                <span className="text-[var(--text-primary)] font-medium">Super Admin</span>
                <p className="text-[var(--text-muted)] text-xs">Has all permissions automatically</p>
              </div>
            </label>
          </div>

          {!formData.is_super_admin && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Permissions</label>
                <span className="text-xs text-[var(--text-muted)]">
                  {formData.permissions.length} selected
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                {permissions?.map((perm) => {
                  const permName = perm.name || perm.Name || ''
                  const permDesc = perm.description || perm.Description || permName
                  const isChecked = formData.permissions.includes(permName)
                  return (
                    <label
                      key={permName}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        isChecked 
                          ? 'bg-[var(--accent)]/20 border border-[var(--accent)]/30' 
                          : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePermission(permName)}
                        className="rounded border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--accent)] focus:ring-[var(--accent)]"
                      />
                      <span className="text-[var(--text-secondary)] text-sm">{permDesc}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Role: ${selectedRole?.name}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} isLoading={updateRole.isPending}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Role Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Moderator"
            required
          />
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of this role"
          />
          
          <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_super_admin}
                onChange={(e) =>
                  setFormData({ ...formData, is_super_admin: e.target.checked })
                }
                className="rounded border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <div>
                <span className="text-[var(--text-primary)] font-medium">Super Admin</span>
                <p className="text-[var(--text-muted)] text-xs">Has all permissions automatically</p>
              </div>
            </label>
          </div>

          {!formData.is_super_admin && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Permissions</label>
                <span className="text-xs text-[var(--text-muted)]">
                  {formData.permissions.length} selected
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                {permissions?.map((perm) => {
                  const permName = perm.name || perm.Name || ''
                  const permDesc = perm.description || perm.Description || permName
                  const isChecked = formData.permissions.includes(permName)
                  return (
                    <label
                      key={permName}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        isChecked 
                          ? 'bg-[var(--accent)]/20 border border-[var(--accent)]/30' 
                          : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePermission(permName)}
                        className="rounded border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--accent)] focus:ring-[var(--accent)]"
                      />
                      <span className="text-[var(--text-secondary)] text-sm">{permDesc}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Role Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Role"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={deleteRole.isPending}>
              Delete Role
            </Button>
          </>
        }
      >
        <Alert type="error">
          Are you sure you want to delete the role <strong>{selectedRole?.name}</strong>?
          Users with this role will need to be reassigned.
        </Alert>
      </Modal>
    </div>
  )
}
