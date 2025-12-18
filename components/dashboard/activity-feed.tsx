
import { getAuditLogs } from "@/app/actions/get-audit-logs";
import { formatDistanceToNow, format } from "date-fns";
import { tr } from "date-fns/locale";
import { 
  MessageSquare, 
  Clock, 
  Building2, 
  User, 
  FileText,
  Activity
} from "lucide-react";
import Link from "next/link";

export async function ActivityFeed() {
  const { data: logs } = await getAuditLogs(20);

  const getIconData = (type: string) => {
    switch (type.toLowerCase()) {
      case 'companies': 
        return { icon: Building2, color: "text-amber-700", bg: "bg-amber-50" };
      case 'persons': 
        return { icon: User, color: "text-blue-600", bg: "bg-blue-50" };
      case 'proposals': 
        return { icon: MessageSquare, color: "text-green-600", bg: "bg-green-50" };
      case 'tasks': 
      case 'activities':
        return { icon: Clock, color: "text-pink-600", bg: "bg-pink-50" };
      case 'orders': 
        return { icon: FileText, color: "text-purple-600", bg: "bg-purple-50" };
      default: 
        return { icon: Activity, color: "text-gray-500", bg: "bg-gray-50" };
    }
  };

  const formatLogContent = (log: any) => {
    const userName = log.user ? log.user.first_name : 'Sistem';
    const companyName = log.company ? log.company.name : null;
    const entityName = log.entity_name || '';
    const action = log.action || '';
    const type = log.entity_type?.toLowerCase();

    // Helper to bold/link text
    const LinkText = ({ text, href = "#", color = "text-blue-600" }: { text: string, href?: string, color?: string }) => (
      <Link href={href} className={`${color} hover:underline font-medium`}>
        {text}
      </Link>
    );

    // Helper for user name
    const UserText = () => <span className="text-gray-900 font-medium">{userName}</span>;

    // Pattern 1: Task / Activity
    // "ETS Tur için Büşra görev ekledi: Teklif Durum Takibi"
    if (type === 'tasks' || type === 'activities' || action.includes('Görev')) {
      return (
        <span className="text-gray-700">
          {companyName ? <><LinkText text={companyName} /> için </> : ''}
          <UserText /> görev ekledi: <LinkText text={entityName} />
        </span>
      );
    }

    // Pattern 2: Proposal
    // "ETS Tur için Büşra teklif ekledi 2733"
    if (type === 'proposals' || action.includes('Teklif')) {
       // Check if it's an update or create
       const verb = action.includes('Güncellendi') ? 'teklifi güncelledi' : 'teklif ekledi';
       return (
        <span className="text-gray-700">
          {companyName ? <><LinkText text={companyName} /> için </> : ''}
          <UserText /> {verb} <LinkText text={entityName} />
        </span>
      );
    }

    // Pattern 3: Company
    // "Büşra kurum ekledi: ETS Tur"
    if (type === 'companies' || action.includes('Şirket')) {
      return (
        <span className="text-gray-700">
          <UserText /> kurum ekledi: <LinkText text={entityName} />
        </span>
      );
    }

    // Pattern 4: Person
    // "Büşra kişi ekledi: Yücel Dilek - ETS Tur"
    if (type === 'persons' || action.includes('Kişi')) {
      const displayText = companyName ? `${entityName} - ${companyName}` : entityName;
      return (
        <span className="text-gray-700">
          <UserText /> kişi ekledi: <LinkText text={displayText} />
        </span>
      );
    }

    // Default Fallback
    return (
      <span className="text-gray-700">
        <UserText /> {action.toLowerCase()} <LinkText text={entityName} />
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900">Aktivite Akışı</h3>
      </div>
      <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
        {logs?.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Henüz aktivite bulunmuyor.
          </div>
        ) : (
          logs?.map((log) => {
            const { icon: Icon, color, bg } = getIconData(log.entity_type || '');
            
            return (
              <div key={log.id} className="flex items-start space-x-4 p-4 hover:bg-gray-50/50 transition-colors">
                <div className={`mt-1 p-2 rounded-lg shrink-0 ${bg} ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-relaxed">
                    {formatLogContent(log)}
                  </div>
                  <div className="mt-1 flex items-center text-xs text-gray-400">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: tr })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
