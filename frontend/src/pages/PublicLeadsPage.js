import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Users, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchLeads, formatDate, formatTime } from '@/services/googleSheetsApi';

const PublicLeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLeads = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchLeads();
      setLeads(data);
    } catch (err) {
      setError('Unable to load leads. Please try again later.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  return (
    <div className="min-h-screen bg-background" data-testid="public-leads-page">
      {/* Header */}
      <header className="py-12 px-4 sm:px-8 text-center border-b border-primary/10">
        <div className="max-w-6xl mx-auto animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Users className="w-10 h-10 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
            Lead Directory
          </h1>
          <p className="mt-4 text-muted-foreground font-body text-base sm:text-lg max-w-xl mx-auto">
            View all registered leads in chronological order
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Controls */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground font-body uppercase tracking-widest">
              {leads.length} Lead{leads.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadLeads}
              disabled={isLoading}
              className="border-primary/30 text-primary hover:bg-primary/5 rounded-none uppercase tracking-wider text-xs"
              data-testid="refresh-leads-btn"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link to="/admin/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:bg-primary/5 rounded-none uppercase tracking-wider text-xs"
                data-testid="admin-login-link"
              >
                <Lock className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </Link>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-card border border-primary/10 shadow-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {isLoading ? (
            <div className="p-12">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="h-6 skeleton-beige flex-1"></div>
                    <div className="h-6 skeleton-beige flex-1"></div>
                    <div className="h-6 skeleton-beige w-32"></div>
                    <div className="h-6 skeleton-beige w-24"></div>
                    <div className="h-6 skeleton-beige w-20"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-destructive font-body" data-testid="error-message">{error}</p>
              <Button
                onClick={loadLeads}
                variant="outline"
                className="mt-4 border-primary/30 text-primary hover:bg-primary/5 rounded-none"
                data-testid="retry-btn"
              >
                Try Again
              </Button>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" strokeWidth={1} />
              <p className="text-muted-foreground font-body" data-testid="no-leads-message">
                No leads found yet.
              </p>
            </div>
          ) : (
            <Table className="leads-table" data-testid="leads-table">
              <TableHeader>
                <TableRow className="border-b-2 border-primary/20 hover:bg-transparent">
                  <TableHead className="font-body uppercase tracking-widest text-xs font-semibold text-primary/70 py-4">
                    Name
                  </TableHead>
                  <TableHead className="font-body uppercase tracking-widest text-xs font-semibold text-primary/70 py-4">
                    Project Name
                  </TableHead>
                  <TableHead className="font-body uppercase tracking-widest text-xs font-semibold text-primary/70 py-4">
                    Phone Number
                  </TableHead>
                  <TableHead className="font-body uppercase tracking-widest text-xs font-semibold text-primary/70 py-4">
                    Date
                  </TableHead>
                  <TableHead className="font-body uppercase tracking-widest text-xs font-semibold text-primary/70 py-4">
                    Time
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead, index) => (
                  <TableRow
                    key={lead.id || index}
                    className="border-b border-primary/5 hover:bg-primary/5 transition-colors duration-200"
                    data-testid={`lead-row-${index}`}
                  >
                    <TableCell className="font-body py-4 font-medium text-foreground">
                      {lead.name || '-'}
                    </TableCell>
                    <TableCell className="font-body py-4 text-foreground">
                      {lead.projectName || lead.project_name || lead.project || '-'}
                    </TableCell>
                    <TableCell className="font-body py-4 text-muted-foreground">
                      {lead.phoneNumber || lead.phone_number || lead.phone || '-'}
                    </TableCell>
                    <TableCell className="font-body py-4 text-muted-foreground">
                      {formatDate(lead.date)}
                    </TableCell>
                    <TableCell className="font-body py-4 text-muted-foreground">
                      {formatTime(lead.time)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground font-body">
          <p>Last updated: {new Date().toLocaleString()}</p>
        </footer>
      </main>
    </div>
  );
};

export default PublicLeadsPage;
