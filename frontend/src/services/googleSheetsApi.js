const GOOGLE_SCRIPT_URL = process.env.REACT_APP_GOOGLE_SCRIPT_URL;

// Extract time components from various formats
const extractTimeComponents = (timeStr) => {
  if (!timeStr) return null;
  
  try {
    // Handle "HH:MM:SS" format
    if (typeof timeStr === 'string' && timeStr.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
      const parts = timeStr.split(':');
      return {
        hours: parseInt(parts[0], 10),
        minutes: parseInt(parts[1], 10),
        seconds: parseInt(parts[2] || '0', 10)
      };
    }
    
    // Handle ISO date string (1899-12-30T06:49:39.000Z format from Google Sheets)
    if (typeof timeStr === 'string' && timeStr.includes('T')) {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        // Use UTC hours since Google Sheets stores time in UTC
        return {
          hours: date.getUTCHours(),
          minutes: date.getUTCMinutes(),
          seconds: date.getUTCSeconds()
        };
      }
    }
    
    // Handle Date object
    if (timeStr instanceof Date) {
      return {
        hours: timeStr.getHours(),
        minutes: timeStr.getMinutes(),
        seconds: timeStr.getSeconds()
      };
    }
  } catch (e) {
    console.error('Error extracting time:', e);
  }
  
  return null;
};

// Parse date from various formats
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  try {
    // Handle "DD/MM/YYYY" format
    if (typeof dateStr === 'string' && dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const parts = dateStr.split('/');
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    
    // Handle ISO format
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    console.error('Error parsing date:', e);
  }
  
  return null;
};

// Parse date and combine with time for accurate timestamp
export const parseDateTime = (dateStr, timeStr) => {
  const date = parseDate(dateStr);
  if (!date) return 0;
  
  const time = extractTimeComponents(timeStr);
  if (time) {
    date.setHours(time.hours, time.minutes, time.seconds);
  }
  
  return date.getTime();
};

// Sort leads by date + time ascending (oldest first, newest last)
export const sortLeadsByDateTime = (leads) => {
  return [...leads].sort((a, b) => {
    const timestampA = parseDateTime(a.date, a.time);
    const timestampB = parseDateTime(b.date, b.time);
    return timestampA - timestampB;
  });
};

// Format date for display (e.g., "25/02/2026")
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  
  const date = parseDate(dateStr);
  if (!date) return dateStr;
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

// Format time for display (e.g., "12:10:49")
export const formatTime = (timeStr) => {
  if (!timeStr) return '-';
  
  const time = extractTimeComponents(timeStr);
  if (!time) return timeStr;
  
  const hours = time.hours.toString().padStart(2, '0');
  const minutes = time.minutes.toString().padStart(2, '0');
  const seconds = time.seconds.toString().padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
};

// Normalize lead data from API
const normalizeLead = (lead, index) => {
  return {
    id: lead.id || `lead-${index}`,
    name: lead.name || '',
    projectName: lead.projectName || lead.project_name || lead.project || '',
    phoneNumber: String(lead.phoneNumber || lead.phone_number || lead.phone || ''),
    date: lead.date || '',
    time: lead.time || ''
  };
};

// Fetch all leads from Google Apps Script
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
    
    const normalizedLeads = leads.map((lead, index) => normalizeLead(lead, index));
    return sortLeadsByDateTime(normalizedLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    throw error;
  }
};

// Add a new lead via Google Apps Script
export const addLead = async (leadData) => {
  try {
    const params = new URLSearchParams({
      action: 'addLead',
      name: leadData.name,
      project: leadData.projectName,
      phone: leadData.phoneNumber,
      date: leadData.date,
      time: leadData.time
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

// Filter leads by search criteria
export const filterLeads = (leads, filters) => {
  return leads.filter(lead => {
    // Name search
    if (filters.searchName && !lead.name.toLowerCase().includes(filters.searchName.toLowerCase())) {
      return false;
    }
    
    // Project filter
    if (filters.project && filters.project !== 'all' && lead.projectName !== filters.project) {
      return false;
    }
    
    // Date filter
    if (filters.date) {
      const leadDate = parseDate(lead.date);
      const filterDate = filters.date;
      
      if (leadDate && filterDate) {
        const leadDateStr = `${leadDate.getFullYear()}-${leadDate.getMonth()}-${leadDate.getDate()}`;
        const filterDateStr = `${filterDate.getFullYear()}-${filterDate.getMonth()}-${filterDate.getDate()}`;
        
        if (leadDateStr !== filterDateStr) {
          return false;
        }
      }
    }
    
    return true;
  });
};

// Get unique project names from leads
export const getUniqueProjects = (leads) => {
  const projects = [...new Set(leads.map(lead => lead.projectName).filter(Boolean))];
  return projects.sort();
};
