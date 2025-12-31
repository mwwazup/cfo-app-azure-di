import { SignUp } from '@clerk/clerk-react';
import Navbar from '../../components/navigation/navbar';

export default function ClerkSignUpPage() {
  return (
    <div className="min-h-screen bg-card flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md flex flex-col items-center">
          {/* Wave Rider branding - larger logo, centered over form */}
          <div className="w-full flex justify-center mb-8">
            <img 
              src="/wave-rider-logo.png" 
              alt="Wave Rider Logo" 
              className="h-24 w-auto"
            />
          </div>
          
          {/* Clerk SignUp - gold button only */}
          <div className="w-full flex justify-center">
            <SignUp
              signInUrl="/sign-in"
              appearance={{
                elements: {
                  rootBox: {
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%'
                  },
                  formButtonPrimary: {
                    backgroundColor: '#D0B568 !important',
                    color: '#ffffff !important',
                    border: 'none !important',
                    borderWidth: '0 !important',
                    borderColor: 'transparent !important',
                    borderStyle: 'none !important',
                    outline: 'none !important',
                    boxShadow: 'none !important',
                  },
                  formButtonPrimaryHover: {
                    backgroundColor: '#B89F4D !important',
                    color: '#ffffff !important',
                    border: 'none !important',
                    borderWidth: '0 !important',
                    borderColor: 'transparent !important',
                    borderStyle: 'none !important',
                    outline: 'none !important',
                    boxShadow: 'none !important',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
