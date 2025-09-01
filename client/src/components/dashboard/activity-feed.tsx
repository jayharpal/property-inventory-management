import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

type ActivityItem = {
  id: number;
  action: string;
  details: string;
  timestamp: string;
};

const getActivityIcon = (action: string) => {
  switch (action) {
    case "PLATFORM_CONNECTED":
    case "PLATFORM_DISCONNECTED":
      return { icon: "fa-sync-alt", bgColor: "bg-blue-100", textColor: "text-blue-600" };
    case "REPORT_GENERATED":
    case "REPORT_SENT":
      return { icon: "fa-receipt", bgColor: "bg-green-100", textColor: "text-green-600" };
    case "LOW_INVENTORY_ALERT":
      return { icon: "fa-exclamation-triangle", bgColor: "bg-red-100", textColor: "text-red-600" };
    case "OWNER_CREATED":
      return { icon: "fa-user-plus", bgColor: "bg-purple-100", textColor: "text-purple-600" };
    case "LISTING_CREATED":
      return { icon: "fa-building", bgColor: "bg-indigo-100", textColor: "text-indigo-600" };
    case "EXPENSE_CREATED":
      return { icon: "fa-dollar-sign", bgColor: "bg-yellow-100", textColor: "text-yellow-600" };
    case "INVENTORY_CREATED":
      return { icon: "fa-boxes", bgColor: "bg-teal-100", textColor: "text-teal-600" };
    default:
      return { icon: "fa-bell", bgColor: "bg-gray-100", textColor: "text-gray-600" };
  }
};

type ActivityFeedProps = {
  activities: ActivityItem[];
};

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getActivityTitle = (action: string) => {
    switch (action) {
      case "PLATFORM_CONNECTED":
        return "Platform connected";
      case "PLATFORM_DISCONNECTED":
        return "Platform disconnected";
      case "REPORT_GENERATED":
        return "Monthly reports generated";
      case "REPORT_SENT":
        return "Monthly reports sent";
      case "LOW_INVENTORY_ALERT":
        return "Low inventory alert";
      case "OWNER_CREATED":
        return "New owner added";
      case "LISTING_CREATED":
        return "New listing added";
      case "EXPENSE_CREATED":
        return "Expense created";
      case "INVENTORY_CREATED":
        return "Inventory item added";
      default:
        return action.toLowerCase().replace(/_/g, ' ');
    }
  };

  return (
    <Card className="shadow">
      <CardHeader className="px-5 py-4 border-b border-border">
        <CardTitle className="text-lg font-medium leading-6 text-foreground">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="px-5 py-3 overflow-y-auto" style={{ maxHeight: "300px" }}>
        <div className="flow-root">
          <ul className="-my-4 divide-y divide-border">
            {activities.map((activity) => {
              const { icon, bgColor, textColor } = getActivityIcon(activity.action);
              return (
                <li key={activity.id} className="py-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${bgColor}`}>
                        <i className={`fas ${icon} ${textColor}`}></i>
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        <a href="#" className="font-medium">{getActivityTitle(activity.action)}</a>
                      </p>
                      <p className="text-sm text-muted-foreground">{activity.details}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(activity.timestamp)}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="border-t border-border px-5 py-3">
        <div className="text-sm">
          <Link href="/analytics">
            <a className="font-medium text-primary hover:text-primary/80">View all activity</a>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
