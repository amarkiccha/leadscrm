import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  LogOut, 
  RefreshCw, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  LayoutDashboard,
  UserPlus,
  Search,
  Filter,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { fetchLeads, addLead, formatDate, formatTime, filterLeads, getUniqueProjects } from '@/services/googleSheetsApi';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    projectName: '',
    phoneNumber: '',
    date: null,
    time: ''
  });
  const [dateOpen, setDateOpen] = useState(false);

  // Filter state
  const [searchName, setSearchName] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [filterDate, setFilterDate] = useState(null);
  const [filterDateOpen, setFilterDateOpen] = useState(false);

  const navigate = useNavigate();
  const { logout } = useAuth();

  // Generate time options (HH:MM:SS format)
  const timeOptions = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      timeOptions.push(`${hour}:${minute}:00`);
    }
  }

  const loadLeads = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchLeads();
      setLeads(data);
    } catch (err) {
      setError('Unable to load leads. Please try again.');
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
      date: filterDate
    });
  }, [leads, searchName, selectedProject, filterDate]);

  // Clear all filters
  const clearFilters = () => {
    setSearchName('');
    setSelectedProject('all');
    setFilterDate(null);
  };

  const hasActiveFilters = searchName || selectedProject !== 'all' || filterDate;

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.projectName || !formData.phoneNumber || !formData.date || !formData.time) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const leadData = {
        name: formData.name,
        projectName: formData.projectName,
        phoneNumber: formData.phoneNumber,
        date: format(formData.date, 'dd/MM/yyyy'),
        time: formData.time
      };

      await addLead(leadData);
      
      toast.success('Lead added successfully', {
        description: 'The new lead has been saved to the sheet.'
      });

      // Reset form
      setFormData({
        name: '',
        projectName: '',
        phoneNumber: '',
        date: null,
        time: ''
      });

      // Refresh leads
      setTimeout(() => {
        loadLeads();
      }, 1500);

    } catch (err) {
      toast.error('Failed to add lead', {
        description: 'Please try again.'
      });
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats
  const totalLeads = leads.length;
  const todayLeads = leads.filter(lead => {
    const today = new Date();
    const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    return formatDate(lead.date) === todayStr;
  }).length;

  return (
    <div className="min-h-screen flex" data-testid="admin-dashboard">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-72 flex-col admin-sidebar text-primary-foreground">
        <div className="p-6 border-b border-white/10">
          <h1 className="font-heading text-2xl font-bold">Propz CRM</h1>
          <p className="text-sm text-primary-foreground/70 font-body mt-1">Admin Dashboard</p>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 bg-white/10 text-primary-foreground font-body text-sm"
              data-testid="nav-dashboard"
            >
              <LayoutDashboard className="w-5 h-5" strokeWidth={1.5} />
              Dashboard
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-primary-foreground hover:bg-white/10 hover:text-primary-foreground font-body"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5 mr-3" strokeWidth={1.5} />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-background overflow-auto">
        {/* Mobile Header */}
        <div className="md:hidden p-4 bg-primary text-primary-foreground flex items-center justify-between">
          <h1 className="font-heading text-xl font-bold">Propz CRM</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-primary-foreground hover:bg-white/10"
            data-testid="mobile-logout-btn"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-in-up">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
              Welcome Back
            </h2>
            <p className="mt-2 text-muted-foreground font-body">
              Manage your leads and track your progress
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
            <div 
              className="bg-card border border-primary/10 p-6 shadow-card animate-fade-in-up"
              style={{ animationDelay: '0.1s' }}
              data-testid="total-leads-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-body uppercase tracking-widest text-muted-foreground">Total Leads</p>
                  <p className="text-4xl font-heading font-bold text-foreground mt-2">{totalLeads}</p>
                </div>
                <div className="w-12 h-12 flex items-center justify-center bg-primary/10">
                  <Users className="w-6 h-6 text-primary" strokeWidth={1.5} />
                </div>
              </div>
            </div>
            <div 
              className="bg-card border border-primary/10 p-6 shadow-card animate-fade-in-up"
              style={{ animationDelay: '0.15s' }}
              data-testid="today-leads-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-body uppercase tracking-widest text-muted-foreground">Today's Leads</p>
                  <p className="text-4xl font-heading font-bold text-foreground mt-2">{todayLeads}</p>
                </div>
                <div className="w-12 h-12 flex items-center justify-center bg-accent/20">
                  <CalendarIcon className="w-6 h-6 text-accent" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </div>

          {/* Add Lead Form */}
          <div 
            className="bg-card border border-primary/10 p-6 sm:p-8 shadow-card mb-8 animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
            data-testid="add-lead-form-container"
          >
            <div className="flex items-center gap-3 mb-6">
              <UserPlus className="w-6 h-6 text-primary" strokeWidth={1.5} />
              <h3 className="font-heading text-xl font-bold text-foreground">Add New Lead</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label className="font-body uppercase tracking-widest text-xs font-semibold text-primary/70">
                    Name
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter name"
                    className="rounded-none border-primary/20 focus:border-primary font-body"
                    data-testid="name-input"
                  />
                </div>

                {/* Project Name */}
                <div className="space-y-2">
                  <Label className="font-body uppercase tracking-widest text-xs font-semibold text-primary/70">
                    Project Name
                  </Label>
                  <Input
                    value={formData.projectName}
                    onChange={(e) => handleInputChange('projectName', e.target.value)}
                    placeholder="Enter project name"
                    className="rounded-none border-primary/20 focus:border-primary font-body"
                    data-testid="project-name-input"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label className="font-body uppercase tracking-widest text-xs font-semibold text-primary/70">
                    Phone Number
                  </Label>
                  <Input
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="Enter phone number"
                    className="rounded-none border-primary/20 focus:border-primary font-body"
                    data-testid="phone-input"
                  />
                </div>

                {/* Date Picker */}
                <div className="space-y-2">
                  <Label className="font-body uppercase tracking-widest text-xs font-semibold text-primary/70">
                    Date
                  </Label>
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal rounded-none border-primary/20 hover:bg-primary/5 font-body"
                        data-testid="date-picker-trigger"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary/70" />
                        {formData.date ? (
                          format(formData.date, 'dd/MM/yyyy')
                        ) : (
                          <span className="text-muted-foreground">Select date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card border-primary/20" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.date}
                        onSelect={(date) => {
                          handleInputChange('date', date);
                          setDateOpen(false);
                        }}
                        initialFocus
                        data-testid="calendar"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time Input */}
                <div className="space-y-2">
                  <Label className="font-body uppercase tracking-widest text-xs font-semibold text-primary/70">
                    Time
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70" />
                    <Input
                      type="time"
                      value={formData.time}
                      onChange={(e) => handleInputChange('time', e.target.value)}
                      className="pl-10 rounded-none border-primary/20 focus:border-primary font-body"
                      data-testid="time-input"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90 btn-primary-sharp px-8"
                data-testid="add-lead-submit-btn"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent animate-spin rounded-full mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Lead
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Filters Section */}
          <div 
            className="bg-card border border-primary/10 p-4 sm:p-6 mb-6 shadow-card animate-fade-in-up"
            style={{ animationDelay: '0.25s' }}
          >
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
                  data-testid="admin-search-name-input"
                />
              </div>

              {/* Project Filter */}
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger 
                  className="rounded-none border-primary/20 font-body"
                  data-testid="admin-project-filter"
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
              <Popover open={filterDateOpen} onOpenChange={setFilterDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal rounded-none border-primary/20 hover:bg-primary/5 font-body"
                    data-testid="admin-date-filter-trigger"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary/70" />
                    {filterDate ? (
                      format(filterDate, 'dd/MM/yyyy')
                    ) : (
                      <span className="text-muted-foreground">Filter by date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-primary/20" align="start">
                  <Calendar
                    mode="single"
                    selected={filterDate}
                    onSelect={(date) => {
                      setFilterDate(date);
                      setFilterDateOpen(false);
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
                  data-testid="admin-clear-filters-btn"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Leads Table */}
          <div 
            className="bg-card border border-primary/10 shadow-card animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
            data-testid="admin-leads-table-container"
          >
            <div className="flex items-center justify-between p-6 border-b border-primary/10">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-primary" strokeWidth={1.5} />
                <h3 className="font-heading text-xl font-bold text-foreground">
                  All Leads ({filteredLeads.length} of {leads.length})
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadLeads}
                disabled={isLoading}
                className="border-primary/30 text-primary hover:bg-primary/5 rounded-none uppercase tracking-wider text-xs"
                data-testid="admin-refresh-btn"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {isLoading ? (
              <div className="p-8">
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
              <div className="p-8 text-center">
                <p className="text-destructive font-body" data-testid="admin-error-message">{error}</p>
                <Button
                  onClick={loadLeads}
                  variant="outline"
                  className="mt-4 border-primary/30 text-primary hover:bg-primary/5 rounded-none"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <Table className="leads-table" data-testid="admin-leads-table">
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
                        <p className="text-muted-foreground font-body" data-testid="admin-no-leads-message">
                          {hasActiveFilters ? 'No leads match your filters.' : 'No leads found. Add your first lead above!'}
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
                        data-testid={`admin-lead-row-${index}`}
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
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
