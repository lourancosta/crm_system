import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersApi } from './api/users';
import type { CreateUserInput } from './api/users';
import { Button } from '../../../shared/components/Button/Button';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Table } from '../../../shared/components/Table/Table';
import type { Column, TablePagination } from '../../../shared/components/Table/Table';
import { UserForm } from './UserForm';
import { ApiError } from '../../../shared/api/client';
import type { User } from '../../../shared/types/index';

const PAGE_SIZE = 50;

const ROLE_COLORS: Record<string, string> = {
  admin: '#16a34a',
  user: '#2563eb',
  viewer: '#9ca3af',
};

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role.toLowerCase()] ?? '#9ca3af';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
        background: `${color}18`,
        color,
        border: `1px solid ${color}40`,
        textTransform: 'capitalize',
      }}
    >
      {role}
    </span>
  );
}

const COLUMNS: Column<User>[] = [
  { key: 'name', header: 'Name', render: (u) => <Link to={`/settings/users/${u.id}`} className="link">{u.firstName} {u.lastName}</Link> },
  { key: 'email', header: 'Email', render: (u) => u.email },
  { key: 'role', header: 'Permission', render: (u) => <RoleBadge role={u.role} /> },
];

export function UsersPage({ hideHeader }: { hideHeader?: boolean } = {}) {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createWarning, setCreateWarning] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  function load() {
    setIsLoading(true);
    usersApi
      .list(page, PAGE_SIZE, debouncedSearch)
      .then((res) => {
        setUsers(res.data);
        setTotal(res.total);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [page, debouncedSearch]);

  async function handleCreate(input: CreateUserInput) {
    setCreateError('');
    setCreateWarning('');
    try {
      const result = await usersApi.create(input);
      setShowCreate(false);
      if (!result.inviteSent) {
        setCreateWarning(
          `User created, but the invite email couldn't be sent to ${result.email}. Check the "User invites" account in Settings > Email Accounts, then use Resend Invite from the user's page.`,
        );
      }
      load();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to create user');
    }
  }

  const pagination: TablePagination = {
    page,
    pageSize: PAGE_SIZE,
    total,
    onPageChange: setPage,
  };

  return (
    <div>
      <div className="page-header">
        {hideHeader ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Manage who has access to this CRM and what account type each person belongs to.
          </p>
        ) : (
          <h1>Users</h1>
        )}
        <Button onClick={() => setShowCreate(true)}>+ New User</Button>
      </div>

      {createWarning && <div className="alert alert-warning">{createWarning}</div>}

      <div className="table-toolbar">
        <input
          className="search-input"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Table
        columns={COLUMNS}
        data={users}
        keyExtractor={(u) => u.id}
        isLoading={isLoading}
        pagination={pagination}
      />

      {showCreate && (
        <Modal title="New User" onClose={() => setShowCreate(false)}>
          {createError && <div className="alert alert-error">{createError}</div>}
          <UserForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}
    </div>
  );
}
