import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import { Member, MemberFormData, MemberFilters } from '../types/member'
import { memberService } from '../services/memberService'
import MemberModal from '../components/MemberModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import './Members.css'

const Members = () => {
  const [members, setMembers] = useState<Member[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [deletingMember, setDeletingMember] = useState<Member | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [filters, setFilters] = useState<MemberFilters>({
    search: '',
    location: ''
  })

  // Load members on component mount
  useEffect(() => {
    const loadMembers = async () => {
      try {
        setIsLoadingMembers(true)
        const data = await memberService.getAllMembers()
        setMembers(data)
      } catch (error) {
        console.error('Failed to load members:', error)
        // Fallback to mock data if Supabase is not configured
        setMembers([
          {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            birthDate: '1985-03-15',
            birthplace: 'Paramaribo',
            address: '123 Main Street, District 1',
            city: 'Paramaribo',
            phone: '+597 123-4567',
            email: 'john.doe@email.com',
            nationalId: '123456789',
            nationality: 'Surinamese',
            occupation: 'Engineer',
            bankName: 'Suriname Bank',
            accountNumber: 'SB001234567',
            dateOfRegistration: '2023-01-01',
            totalReceived: 12000.00,
            lastPayment: '2024-01-15',
            nextPayment: '2024-02-15',
            notes: 'Reliable member, always pays on time',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z'
          },
          {
            id: 2,
            firstName: 'Jane',
            lastName: 'Smith',
            birthDate: '1990-07-22',
            birthplace: 'Nieuw Nickerie',
            address: '456 Oak Avenue, District 2',
            city: 'Nieuw Nickerie',
            phone: '+597 234-5678',
            email: 'jane.smith@email.com',
            nationalId: '987654321',
            nationality: 'Surinamese',
            occupation: 'Teacher',
            bankName: 'Finance Bank',
            accountNumber: 'FB987654321',
            dateOfRegistration: '2023-02-01',
            totalReceived: 9000.00,
            lastPayment: '2024-01-20',
            nextPayment: '2024-02-20',
            notes: 'New member, showing good progress',
            created_at: '2023-02-01T00:00:00Z',
            updated_at: '2024-01-20T00:00:00Z'
          },
          {
            id: 3,
            firstName: 'Mike',
            lastName: 'Johnson',
            birthDate: '1988-11-08',
            birthplace: 'Lelydorp',
            address: '789 Pine Road, District 3',
            city: 'Lelydorp',
            phone: '+597 345-6789',
            email: 'mike.johnson@email.com',
            nationalId: '456789123',
            nationality: 'Surinamese',
            occupation: 'Business Owner',
            bankName: 'Commercial Bank',
            accountNumber: 'CB456789123',
            dateOfRegistration: '2023-03-01',
            totalReceived: 0.00,
            lastPayment: '2024-01-10',
            nextPayment: '2024-02-10',
            notes: 'Needs follow-up on payments',
            created_at: '2023-03-01T00:00:00Z',
            updated_at: '2024-01-10T00:00:00Z'
          }
        ])
      } finally {
        setIsLoadingMembers(false)
      }
    }

    loadMembers()
  }, [])

  // Filter members based on search and filters
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch = 
        member.firstName.toLowerCase().includes(filters.search.toLowerCase()) ||
        member.lastName.toLowerCase().includes(filters.search.toLowerCase()) ||
        member.email.toLowerCase().includes(filters.search.toLowerCase()) ||
        member.phone.includes(filters.search) ||
        member.city.toLowerCase().includes(filters.search.toLowerCase())

      const matchesCity = !filters.location || member.city === filters.location

      return matchesSearch && matchesCity
    })
  }, [members, filters])

  const handleSaveMember = async (memberData: MemberFormData) => {
    try {
      setIsLoading(true)
      if (editingMember) {
        const updatedMember = await memberService.updateMember(editingMember.id, memberData)
        setMembers(prev => prev.map(m => m.id === editingMember.id ? updatedMember : m))
      } else {
        const newMember = await memberService.createMember(memberData)
        setMembers(prev => [...prev, newMember])
      }
      setIsModalOpen(false)
      setEditingMember(null)
    } catch (error) {
      console.error('Error saving member:', error)
      // You might want to show an error message to the user here
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditMember = (member: Member) => {
    setEditingMember(member)
    setIsModalOpen(true)
  }

  const handleDeleteMember = (member: Member) => {
    setDeletingMember(member)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingMember) return

    try {
      setIsLoading(true)
      await memberService.deleteMember(deletingMember.id)
      setMembers(prev => prev.filter(m => m.id !== deletingMember.id))
      setIsDeleteModalOpen(false)
      setDeletingMember(null)
    } catch (error) {
      console.error('Error deleting member:', error)
      // You might want to show an error message to the user here
    } finally {
      setIsLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingMember(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingMember(null)
  }

  // Get unique values for filter dropdowns
  const uniqueCities = [...new Set(members.map(m => m.city))]

  return (
    <div className="members-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Members</h1>
          <p>Manage your organization's members</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={20} />
          Add Member
        </button>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            className="search-input"
            placeholder="Search members by name, email, phone, or city..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>

        <div className="filters-row">
          <select
            className="filter-select"
            value={filters.location}
                          onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
          >
            <option value="">All Cities</option>
            {uniqueCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="member-count">
        {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} found
      </div>

      {isLoadingMembers ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading members...</p>
        </div>
      ) : (
        <div className="members-list">
          {filteredMembers.map((member) => (
            <div key={member.id} className="member-card">
              <div className="member-header">
                <div className="member-name">
                  <h3>{member.firstName} {member.lastName}</h3>
                </div>
                <div className="member-menu">
                  <button
                    className="member-menu-btn"
                    onClick={() => handleEditMember(member)}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="member-menu-btn delete"
                    onClick={() => handleDeleteMember(member)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="member-details">
                <div className="detail-row">
                  <div className="detail-item">
                    <span className="detail-label">Contact:</span>
                    <span className="detail-value">{member.phone}</span>
                    <span className="detail-value">{member.email}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">{member.city}</span>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-item">
                    <span className="detail-label">Nationality:</span>
                    <span className="detail-value">{member.nationality}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Occupation:</span>
                    <span className="detail-value">{member.occupation}</span>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-item">
                    <span className="detail-label">Registration:</span>
                    <span className="detail-value">{new Date(member.dateOfRegistration).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Financial:</span>
                    <span className="detail-value">Received: ${member.totalReceived.toLocaleString()}</span>
                  </div>
                </div>

                {member.notes && (
                  <div className="detail-row">
                    <div className="detail-item">
                      <span className="detail-label">Notes:</span>
                      <span className="detail-value notes">{member.notes}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <MemberModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveMember}
        member={editingMember}
        isEditing={!!editingMember}
        isLoading={isLoading}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        itemName={`${deletingMember?.firstName} ${deletingMember?.lastName}`}
        itemType="Member"
        isLoading={isLoading}
      />
    </div>
  )
}

export default Members

