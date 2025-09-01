import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home } from "lucide-react";
import { type Listing as SchemaListing } from "@/lib/schema-types";

// Simplified listing type for component props - compatible with both types
type Listing = {
  id: number;
  name: string;
  address: string;
  propertyType: string;
  image?: string | null;
};

type RecentListingsProps = {
  listings: (Listing | SchemaListing)[];
};

export default function RecentListings({ listings }: RecentListingsProps) {
  const getPropertyTypeBadgeClass = (propertyType: string) => {
    switch (propertyType.toLowerCase()) {
      case 'apartment':
        return 'bg-blue-100 text-blue-800';
      case 'house':
        return 'bg-green-100 text-green-800';
      case 'condo':
        return 'bg-purple-100 text-purple-800';
      case 'villa':
        return 'bg-amber-100 text-amber-800';
      case 'cabin':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="shadow">
      <CardHeader className="px-5 py-4 border-b border-border flex justify-between items-center">
        <CardTitle className="text-lg font-medium leading-6 text-foreground">Recent Listings</CardTitle>
        <Link href="/listings">
          <Button variant="link" className="text-sm font-medium text-primary hover:text-primary/80">
            View all
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="divide-y divide-border max-h-96 overflow-y-auto p-0">
        {listings.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">No listings available</p>
            <Link href="/listings">
              <Button variant="link" className="mt-2 text-primary hover:text-primary/80">
                Add your first listing
              </Button>
            </Link>
          </div>
        ) : (
          listings.map((listing) => (
            <div key={listing.id} className="px-5 py-4 hover:bg-accent/50">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                  {listing.image ? (
                    <img
                      src={listing.image}
                      alt={listing.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Home className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {listing.name}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    <i className="fas fa-map-marker-alt mr-1 text-muted-foreground"></i> {listing.address}
                  </p>
                  <p className="mt-1 flex items-center text-sm text-muted-foreground">
                    <span className={`${getPropertyTypeBadgeClass(listing.propertyType)} text-xs px-2 py-0.5 rounded mr-2`}>
                      {listing.propertyType.toUpperCase()}
                    </span>
                  </p>
                </div>
                <div>
                  <Link href={`/listings/${listing.id}`}>
                    <Button
                      size="icon"
                      className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none"
                    >
                      <i className="fas fa-chevron-right"></i>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
