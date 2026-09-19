import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@workspace/ref-design/components/ui/toaster';
import { TooltipProvider } from '@workspace/ref-design/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { Layout } from '@/components/layout';
import { OnboardingProvider } from '@/components/walkthrough/onboarding-context';
import Dashboard from '@/pages/dashboard';
import InvoiceDetail from '@/pages/invoice-detail';
import Invoices from '@/pages/invoices';
import RiskModels from '@/pages/risk-models';
import Messages from '@/pages/messages';
import Reports from '@/pages/reports';
import PaymentCollection from '@/pages/payment-collection';
import Integrations from '@/pages/integrations';
import Export from '@/pages/export';
import Settings from '@/pages/settings';
import CustomerWorkspace from '@/pages/customer-workspace';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/invoices" component={Invoices} />
          <Route path="/invoices/:id" component={InvoiceDetail} />
          <Route path="/customers/:invoiceId" component={CustomerWorkspace} />
          <Route path="/messages" component={Messages} />
          <Route path="/reports" component={Reports} />
          <Route path="/payment-collection" component={PaymentCollection} />
          <Route path="/integrations" component={Integrations} />
          <Route path="/export" component={Export} />
          <Route path="/risk-models" component={RiskModels} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Layout>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <OnboardingProvider>
            <Router />
          </OnboardingProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
