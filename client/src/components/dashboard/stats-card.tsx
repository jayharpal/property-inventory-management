import { Card } from "@/components/ui/card";
import { Link } from "wouter";

type StatsCardProps = {
  title: string;
  value: string | number;
  icon: string;
  iconColor: string;
  link: string;
  linkText: string;
};

export default function StatsCard({
  title,
  value,
  icon,
  iconColor,
  link,
  linkText
}: StatsCardProps) {
  return (
    <Card className="overflow-hidden shadow">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <i className={`fas ${icon} ${iconColor} text-2xl`}></i>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-muted-foreground truncate">{title}</dt>
              <dd>
                <div className="text-lg font-semibold text-foreground">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="bg-muted/50 px-5 py-3 dark:bg-muted">
        <div className="text-sm">
          <Link href={link}>
            <a className="font-medium text-primary hover:text-primary/80">{linkText}</a>
          </Link>
        </div>
      </div>
    </Card>
  );
}
