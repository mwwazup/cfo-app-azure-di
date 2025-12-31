import { UserProfile } from '@clerk/clerk-react';

export function AccountPage() {
  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <UserProfile 
        path="/user"
        routing="path"
      />
    </div>
  );
}
