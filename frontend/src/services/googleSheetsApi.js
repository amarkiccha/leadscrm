const GOOGLE_SCRIPT_URL = process.env.REACT_APP_GOOGLE_SCRIPT_URL;

/**
 * Parse date from various formats (DD/MM/YYYY, ISO, etc.)
 * Returns Date object or null
 */
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  try {
    // Handle DD/MM/YYYY format
    if (typeof dateStr === 'string' && dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const parts = dateStr.split('/');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day, 0, 0, 0, 0);
    }
    
    // Handle YYYY-MM-DD format
    if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = dateStr.split('-');
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
    }
    
    // Handle ISO format (from Google Sheets)
    if (typeof dateStr === 'string' && dateStr.includes('T')) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        // Return date only (strip time)
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      }
    }
    
    // Try direct parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    }
  } catch (e) {
    console.error('Error parsing date:', e);
  }
  
  return null;
};

/**
 * Parse time from various formats (HH:MM:SS, HH:MM, ISO datetime)
 * Returns object with hours, minutes, seconds or null
 */
const parseTime = (timeStr) => {
  if (!timeStr) return null;
  
  try {
    // Handle HH:MM:SS or HH:MM format
    if (typeof timeStr === 'string' && timeStr.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
      const parts = timeStr.split(':');
      return {
        hours: parseInt(parts[0], 10),
        minutes: parseInt(parts[1], 10),
        seconds: parseInt(parts[2] || '0', 10)
      };
    }
    
    // Handle ISO format from Google Sheets (1899-12-30T06:49:39.000Z)
    if (typeof timeStr === 'string' && timeStr.includes('T')) {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return {
          hours: date.getUTCHours(),
          minutes: date.getUTCMinutes(),
          seconds: date.getUTCSeconds()
        };
      }
    }
  } catch (e) {
    console.error('Error parsing time:', e);
  }
  
  return null;
};

/**
 * CRITICAL: Create timestamp from separate Date and Time for sorting
 * Date and Time are kept separate - only combined for sorting comparison
 */
export const createSortableTimestamp = (dateStr, timeStr) => {
  const date = parseDate(dateStr);
  if (!date) return 0; // Invalid date goes to beginning
  
  const time = parseTime(timeStr);
  
  // Combine date and time into single timestamp for sorting
  const timestamp = new Date(date);
  if (time) {
    timestamp.setHours(time.hours, time.minutes, time.seconds, 0);
  }
  
  return timestamp.getTime();
};

/**
 * CRITICAL: Sort leads by Date + Time ASCENDING (oldest first, newest last)
 * This ensures correct chronological order regardless of sheet row order
 */
export const sortLeadsByDateTime = (leads) => {
  return [...leads].sort((a, b) => {
    const timestampA = createSortableTimestamp(a.date, a.time);
    const timestampB = createSortableTimestamp(b.date, b.time);
    
    // Ascending order: oldest (smallest timestamp) first, newest last
    return timestampA - timestampB;
  });
};

/**
 * Format date for display: DD/MM/YYYY
 * Date column contains ONLY date
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  
  const date = parseDate(dateStr);
  if (!date) return '-';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Format time for display: HH:MM (no seconds)
 * Time column contains ONLY time
 */
export const formatTime = (timeStr) => {
  if (!timeStr) return '-';
  
  const time = parseTime(timeStr);
  if (!time) return '-';
  
  const hours = time.hours.toString().padStart(2, '0');
  const minutes = time.minutes.toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
};

/**
 * Normalize lead data from API to consistent format
 */
const normalizeLead = (lead, index) => {
  return {
    id: lead.id || `lead-${index}-${Date.now()}`,
    name: lead.name || '',
    projectName: lead.projectName || lead.project_name || lead.project || '',
    phoneNumber: String(lead.phoneNumber || lead.phone_number || lead.phone || ''),
    date: lead.date || '',  // Keep as separate date
    time: lead.time || ''   // Keep as separate time
  };
};

/**
 * Fetch all leads from Google Apps Script
 * ALWAYS sorts by Date + Time ascending before returning
 */
export const fetchLeads = async () => {
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getLeads`, {
      method: 'GET',
      redirect: 'follow',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    let data;
    
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse response:', text);
      throw new Error('Invalid JSON response');
    }
    
    // Handle different response formats
    let leads = [];
    if (Array.isArray(data)) {
      leads = data;
    } else if (data.leads && Array.isArray(data.leads)) {
      leads = data.leads;
    } else if (data.data && Array.isArray(data.data)) {
      leads = data.data;
    } else if (data.error) {
      throw new Error(data.error);
    }
    
    // Normalize all leads
    const normalizedLeads = leads.map((lead, index) => normalizeLead(lead, index));
    
    // CRITICAL: Always sort by Date + Time ascending (oldest first, newest last)
    // This ensures correct chronological order regardless of sheet row order
    return sortLeadsByDateTime(normalizedLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    throw error;
  }
};

/**
 * Add a new lead via Google Apps Script
 * Date and Time are sent as separate values
 */
export const addLead = async (leadData) => {
  try {
    // Date as DD/MM/YYYY, Time as HH:MM:SS - sent separately
    const params = new URLSearchParams({
      action: 'addLead',
      name: leadData.name,
      project: leadData.projectName,
      phone: leadData.phoneNumber,
      date: leadData.date,  // Date only: DD/MM/YYYY
      time: leadData.time   // Time only: HH:MM:SS
    });

    const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`, {
      method: 'GET',
      redirect: 'follow',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      if (data.error) {
        throw new Error(data.error);
      }
      return data;
    } catch (parseError) {
      return { success: true };
    }
  } catch (error) {
    console.error('Error adding lead:', error);
    throw error;
  }
};

/**
 * Filter leads by search criteria
 * Filtering happens AFTER sorting, so chronological order is preserved
 */
export const filterLeads = (leads, filters) => {
  return leads.filter(lead => {
    // Name search (case-insensitive)
    if (filters.searchName && !lead.name.toLowerCase().includes(filters.searchName.toLowerCase())) {
      return false;
    }
    
    // Project filter (exact match)
    if (filters.project && filters.project !== 'all' && lead.projectName !== filters.project) {
      return false;
    }
    
    // Date filter (match specific date)
    if (filters.date) {
      const leadDate = parseDate(lead.date);
      const filterDate = filters.date;
      
      if (leadDate && filterDate) {
        // Compare date parts only
        if (leadDate.getFullYear() !== filterDate.getFullYear() ||
            leadDate.getMonth() !== filterDate.getMonth() ||
            leadDate.getDate() !== filterDate.getDate()) {
          return false;
        }
      } else if (!leadDate) {
        return false; // No date on lead, filter requires date
      }
    }
    
    return true;
  });
};

/**
 * Get unique project names from leads for filter dropdown
 */
export const getUniqueProjects = (leads) => {
  const projects = [...new Set(leads.map(lead => lead.projectName).filter(Boolean))];
  return projects.sort();
};

/**
 * Get current date in DD/MM/YYYY format (for auto leads)
 */
export const getCurrentDate = () => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Get current time in HH:MM:SS format (for auto leads)
 */
export const getCurrentTime = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};
