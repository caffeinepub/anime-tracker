import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import Footer from "./components/Footer";
import Header from "./components/Header";
import ProfileSetupDialog from "./components/ProfileSetupDialog";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "./hooks/useQueries";
import MainPage from "./pages/MainPage";
import MyWatchlistsPage from "./pages/MyWatchlistsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    },
  },
});

function Layout() {
  const { identity, isInitializing } = useInternetIdentity();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();
  const [currentPage, setCurrentPage] = useState<"main" | "watchlists">("main");

  const isAuthenticated = !!identity;
  const showProfileSetup =
    isAuthenticated && !profileLoading && isFetched && userProfile === null;

  // Don't render until identity initialization is complete
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-accent/5">
      <Header currentPage={currentPage} onNavigate={setCurrentPage} />

      <main
        className={`flex-1 py-8 ${currentPage === "main" ? "container mx-auto px-4" : ""}`}
      >
        {currentPage === "main" ? <MainPage /> : <MyWatchlistsPage />}
      </main>

      <Footer />
      <Toaster />

      {showProfileSetup && <ProfileSetupDialog />}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <Layout />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
