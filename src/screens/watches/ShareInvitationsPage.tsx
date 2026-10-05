import { ShareInvitationsList } from '@/components/ShareInvitations';

export default function ShareInvitationsPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Share invitations</h1>
        <p className="text-sm text-ink-soft">
          Invitations to co-own or consign a watch. Every share must be accepted before a sale can be
          recorded.
        </p>
      </header>

      <ShareInvitationsList showHistory />
    </div>
  );
}