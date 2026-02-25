import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Users, Lock, Search, X, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchLeads, formatDate, formatTime, filterLeads, getUniqueProjects } from '@/services/googleSheetsApi';
import { format } from 'date-fns';

const PublicLeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter state
  const [searchName, setSearchName] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateOpen, setDateOpen] = useState(false);

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

  // Get unique projects for filter dropdown
  const projects = useMemo(() => getUniqueProjects(leads), [leads]);

  // Filter leads based on search criteria
  const filteredLeads = useMemo(() => {
    return filterLeads(leads, {
      searchName,
      project: selectedProject,
      date: selectedDate
    });
  }, [leads, searchName, selectedProject, selectedDate]);

  // Clear all filters
  const clearFilters = () => {
    setSearchName('');
    setSelectedProject('all');
    setSelectedDate(null);
  };

  const hasActiveFilters = searchName || selectedProject !== 'all' || selectedDate;

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
        {/* Filters Section */}
        <div className="bg-card border border-primary/10 p-4 sm:p-6 mb-6 shadow-card animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-primary" strokeWidth={1.5} />
            <h3 className="font-body font-semibold text-foreground">Search & Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Name Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-10 rounded-none border-primary/20 font-body"
                data-testid="search-name-input"
              />
            </div>

            {/* Project Filter */}
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger 
                className="rounded-none border-primary/20 font-body"
                data-testid="project-filter"
              >
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent className="bg-card border-primary/20">
                <SelectItem value="all" className="font-body">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project} value={project} className="font-body">
                    {project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal rounded-none border-primary/20 hover:bg-primary/5 font-body"
                  data-testid="date-filter-trigger"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary/70" />
                  {selectedDate ? (
                    format(selectedDate, 'dd/MM/yyyy')
                  ) : (
                    <span className="text-muted-foreground">Filter by date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-primary/20" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setDateOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="border-primary/30 text-primary hover:bg-primary/5 rounded-none font-body"
                data-testid="clear-filters-btn"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground font-body uppercase tracking-widest">
              {filteredLeads.length} of {leads.length} Lead{leads.length !== 1 ? 's' : ''}
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
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" strokeWidth={1} />
                      <p className="text-muted-foreground font-body" data-testid="no-leads-message">
                        {hasActiveFilters ? 'No leads match your filters.' : 'No leads found yet.'}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          onClick={clearFilters}
                          className="mt-4 border-primary/30 text-primary hover:bg-primary/5 rounded-none"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead, index) => (
                    <TableRow
                      key={lead.id || index}
                      className="border-b border-primary/5 hover:bg-primary/5 transition-colors duration-200"
                      data-testid={`lead-row-${index}`}
                    >
                      <TableCell className="font-body py-4 font-medium text-foreground">
                        {lead.name || '-'}
                      </TableCell>
                      <TableCell className="font-body py-4 text-foreground">
                        {lead.projectName || '-'}
                      </TableCell>
                      <TableCell className="font-body py-4 text-muted-foreground">
                        {lead.phoneNumber || '-'}
                      </TableCell>
                      <TableCell className="font-body py-4 text-muted-foreground">
                        {formatDate(lead.date)}
                      </TableCell>
                      <TableCell className="font-body py-4 text-muted-foreground">
                        {formatTime(lead.time)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
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
