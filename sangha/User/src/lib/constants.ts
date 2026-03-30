export const API_BASE = "http://localhost:8000/api";

export const INCOME_SLAB_MAP: Record<string, string> = {
  "Less than ₹1 Lakh":  "below_1l",
  "₹1 – 2 Lakh":        "1_2l",
  "₹2 – 3 Lakh":        "2_3l",
  "₹3 – 5 Lakh":        "3_5l",
  "₹5 – 10 Lakh":       "5_10l",
  "₹10 – 25 Lakh":      "10_25l",
  "₹25 Lakh+":          "25l_plus",
};

export const INCOME_SLAB_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(INCOME_SLAB_MAP).map(([k, v]) => [v, k])
);

export const COVERAGE_MAP: Record<string, string> = {
  "Self": "self", "Wife": "wife", "Kids": "kids", "Parents": "parents", "All": "all",
};

export const COVERAGE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(COVERAGE_MAP).map(([k, v]) => [v, k])
);