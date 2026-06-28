export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const COMPANY_TYPES: Record<string, string[]> = {
  "Technology & IT": ["Software Development", "Artificial Intelligence (AI)", "Cybersecurity", "Cloud Computing", "IT Services", "Data Analytics", "Telecommunications"],
  "Manufacturing": ["Automobile Manufacturing", "Electronics Manufacturing", "Textile Manufacturing", "Machinery Manufacturing", "Chemical Manufacturing", "Consumer Goods Manufacturing"],
  "Finance": ["Banking", "Insurance", "Investment Services", "FinTech", "Asset Management", "Stock Broking"],
  "Healthcare": ["Hospitals & Clinics", "Pharmaceuticals", "Biotechnology", "Medical Devices", "Healthcare Technology"],
  "Retail & E-commerce": ["Retail Stores", "E-commerce", "Wholesale Trade", "Consumer Goods"],
  "Education": ["Schools & Colleges", "EdTech"],
  "Energy & Utilities": ["Oil & Gas", "Renewable Energy", "Power Generation", "Water Utilities"],
  "Construction & Real Estate": ["Construction", "Real Estate Development", "Property Management", "Infrastructure Development"],
  "Transportation & Logistics": ["Shipping", "Logistics", "Warehousing", "Aviation", "Rail Transport"],
  "Agriculture & Food": ["Farming", "Agribusiness", "Food Processing", "Dairy", "Fisheries"],
  "Media & Entertainment": ["Film Production", "Television", "Music", "Publishing", "Gaming", "Digital Media"],
  "Hospitality & Tourism": ["Hotels", "Resorts", "Travel Agencies", "Event Management"],
  "Consulting & Professional Services": ["Management Consulting", "IT Consulting", "Legal Services", "Accounting & Auditing", "Human Resources"],
  "Marketing & Advertising": ["Digital Marketing", "Advertising", "Public Relations", "Branding"],
  "Telecommunications": ["Mobile Networks", "Internet Service Providers", "Satellite Communications"],
  "Mining & Metals": ["Mining", "Metal Processing", "Mineral Exploration"],
  "Defense & Aerospace": ["Defense Manufacturing", "Aerospace Engineering", "Space Technology"],
  "Environmental Services": ["Waste Management", "Recycling", "Environmental Consulting"],
};

export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Internship", "Volunteer", "Contract"];
export const WORK_SETTINGS = ["On-site", "Hybrid", "Remote"];
export const EXPERIENCE_LEVELS = ["Entry level", "Associate", "Mid-Senior level", "Director", "Executive"];
export const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

export const APPLICATION_STATUSES = [
  "Submitted",
  "Application Viewed",
  "In Review",
  "Interviewing",
  "Rejected",
  "Offer",
];