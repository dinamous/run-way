import React, { useEffect } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { useMemberStore } from '@/store/useMemberStore';
import { useClientStore } from '@/store/useClientStore';
import { useAuthContext } from '@/contexts/AuthContext';
import MemberCard from './components/MemberCard';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MembersView: React.FC = () => {
  const { isAdmin } = useAuthContext();
  const { selectedClientId } = useClientStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { members, fetchMembers } = useMemberStore();
  const today = todayStr();

  useEffect(() => {
    fetchTasks(selectedClientId, isAdmin);
    fetchMembers(selectedClientId);
  }, [selectedClientId, isAdmin, fetchTasks, fetchMembers]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Capacity da Equipe</h2>
        <p className="text-muted-foreground">Alocação por step ativo por membro.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {members.map(member => (
          <MemberCard key={member.id} member={member} tasks={tasks} today={today} />
        ))}
      </div>
    </div>
  );
};

export default MembersView;
