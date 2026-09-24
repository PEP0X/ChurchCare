use serde_json::Value;

/// Checks if husband status represents an absent husband
pub fn is_husband_absent(husband_obj: &Value) -> bool {
    let status = husband_obj.get("status").and_then(|v| v.as_str()).unwrap_or("");
    let is_present = husband_obj.get("is_present").and_then(|v| v.as_bool()).unwrap_or(true);
    let name = husband_obj.get("name").and_then(|v| v.as_str()).unwrap_or("").trim();

    if !is_present && !status.is_empty() {
        return true;
    }
    match status {
        "deceased" | "abandoned" | "apostate" | "separated" | "traveler" | "prisoner" | "other" => true,
        _ => {
            if name.contains("متوفي") || name.contains("مرحوم") || name.contains("تارك") || name.contains("مسافر") {
                true
            } else {
                false
            }
        }
    }
}

/// Recursively traverses a JSON object by a dot-separated or bracket-indexed path
pub fn get_nested_value<'a>(data: &'a Value, path: &str) -> Option<&'a Value> {
    if path.is_empty() {
        return None;
    }

    let mut current = data;
    // Replace brackets with dot notation: foo[0].bar -> foo.0.bar
    let normalized = path.replace('[', ".").replace(']', "");
    for part in normalized.split('.') {
        if part.is_empty() {
            continue;
        }
        if let Ok(idx) = part.parse::<usize>() {
            if let Some(arr) = current.as_array() {
                current = arr.get(idx)?;
            } else if let Some(obj) = current.as_object() {
                current = obj.get(part)?;
            } else {
                return None;
            }
        } else if let Some(obj) = current.as_object() {
            current = obj.get(part)?;
        } else {
            return None;
        }
    }
    Some(current)
}

fn parse_numeric(val: Option<&Value>) -> f64 {
    match val {
        Some(Value::Number(n)) => n.as_f64().unwrap_or(0.0),
        Some(Value::String(s)) => {
            let clean = s.replace("ج.م", "").replace(',', "").trim().to_string();
            clean.parse::<f64>().unwrap_or(0.0)
        }
        _ => 0.0,
    }
}

/// Resolves a field binding against the case study JSON data with all aliases and fallback rules
pub fn resolve_field_value(data: &Value, binding: &str, field_id: &str) -> String {
    if binding.is_empty() {
        return "".to_string();
    }

    // 1. Direct path lookup
    if let Some(val) = get_nested_value(data, binding) {
        if !val.is_null() {
            if let Some(s) = val.as_str() {
                if !s.is_empty() {
                    return s.to_string();
                }
            } else if let Some(b) = val.as_bool() {
                return if b { "true".to_string() } else { "false".to_string() };
            } else if let Some(n) = val.as_f64() {
                return n.to_string();
            }
        }
    }

    // 2. Direct root-level key check (e.g. "الدخل الشهري - كشك")
    if let Some(obj) = data.as_object() {
        if let Some(val) = obj.get(binding) {
            if let Some(s) = val.as_str() {
                if !s.is_empty() {
                    return s.to_string();
                }
            } else if let Some(n) = val.as_f64() {
                return n.to_string();
            }
        }
    }

    // 3. Aliases resolution
    let aliases: &[&str] = match binding {
        "page6.head_name" | "page6.family_head" => &[
            "page6.family_head",
            "page6.head_name",
            "page2.husband.name",
            "page2.wife.name",
        ],
        "page6.church_id" | "page6.church_records_id" => &["page6.church_records_id", "page1.church_study_id"],
        "page6.care_id" | "page6.cathedral_care_id" => &["page6.cathedral_care_id", "page1.cathedral_care_id"],
        "page6.member_id" | "page6.church_membership_id" => &["page6.church_membership_id", "page1.church_membership_id"],
        "page5.other_notes" | "page5.notes" => &["page5.notes", "page5.other_notes"],
        "page4.total_church_aid" | "page4.church_aid.Total" | "page4.church_aid_total" => {
            &["page4.total_church_aid", "page4.church_aid_total"]
        }
        "page4.church_aid_total_notes" | "page4.church_aid.purpose" => &["page4.church_aid_total_notes"],
        "الدخل الشهري - معاش" | "page4.income.pension" | "page4.pension" => &[
            "الدخل الشهري - معاش",
            "page4.income.pension",
            "page4.pension",
        ],
        "page3.family_members_notes" | "Page3.comment1" => &["page3.family_members_notes", "Page3.comment1"],
        "page3.other_members_notes" | "Page3.comment2" => &["page3.other_members_notes", "Page3.comment2"],
        "husband_id_image" | "page1.husband_id_image" => &["husband_id_image", "page1.husband_id_image"],
        "husband_id_back_image" | "page1.husband_id_back_image" => &["husband_id_back_image", "page1.husband_id_back_image"],
        "wife_id_image" | "page1.wife_id_image" => &["wife_id_image", "page1.wife_id_image"],
        "wife_id_back_image" | "page1.wife_id_back_image" => &["wife_id_back_image", "page1.wife_id_back_image"],
        _ => &[],
    };

    for alt in aliases {
        if let Some(val) = get_nested_value(data, alt) {
            if let Some(s) = val.as_str() {
                if !s.is_empty() {
                    return s.to_string();
                }
            }
        }
    }

    // 4. Date decomposition
    if binding.starts_with("page1.day") || binding.starts_with("page1.month") || binding.starts_with("page1.year") {
        if let Some(study_date) = get_nested_value(data, "page1.study_date").and_then(|v| v.as_str()) {
            let normalized = study_date.replace('-', "/");
            let parts: Vec<&str> = normalized.split('/').collect();
            if parts.len() == 3 {
                let (y, m, d) = if parts[0].len() == 4 {
                    (parts[0], parts[1], parts[2])
                } else {
                    (parts[2], parts[1], parts[0])
                };
                match binding {
                    "page1.day" => return d.to_string(),
                    "page1.month" => return m.to_string(),
                    "page1.year" => return y.to_string(),
                    _ => {}
                }
            }
        }
    }

    if binding.starts_with("page6.from_date_") || binding.starts_with("page6.to_date_") {
        let (date_key, target_part) = if binding.starts_with("page6.from_date_") {
            ("page6.from_date", binding.trim_start_matches("page6.from_date_"))
        } else {
            ("page6.to_date", binding.trim_start_matches("page6.to_date_"))
        };

        if let Some(date_str) = get_nested_value(data, date_key).and_then(|v| v.as_str()) {
            let normalized = date_str.replace('-', "/");
            let parts: Vec<&str> = normalized.split('/').collect();
            if parts.len() == 3 {
                let (y, m, d) = if parts[0].len() == 4 {
                    (parts[0], parts[1], parts[2])
                } else {
                    (parts[2], parts[1], parts[0])
                };
                match target_part {
                    "day" => return d.to_string(),
                    "month" => return m.to_string(),
                    "year" => return y.to_string(),
                    _ => {}
                }
            }
        }
    }

    // 5. Special Head of Household for Page 6
    if binding == "page6.head_name" || binding == "page6.family_head" {
        let husband = data.get("page2").and_then(|p2| p2.get("husband"));
        let wife = data.get("page2").and_then(|p2| p2.get("wife"));
        let husband_name = husband.and_then(|h| h.get("name")).and_then(|v| v.as_str()).unwrap_or("").trim();
        let wife_name = wife.and_then(|w| w.get("name")).and_then(|v| v.as_str()).unwrap_or("").trim();

        if let Some(h) = husband {
            if is_husband_absent(h) && !wife_name.is_empty() {
                return wife_name.to_string();
            }
        }
        if !husband_name.is_empty() {
            return husband_name.to_string();
        }
        if !wife_name.is_empty() {
            return wife_name.to_string();
        }
    }

    // 6. Page 4 Salary & Income calculations
    if binding == "page4.income.base_salary" {
        let h_sal = parse_numeric(get_nested_value(data, "page2.husband.salary"));
        if h_sal > 0.0 {
            return format!("{:.0}", h_sal);
        }
    }

    if binding == "page4.income.side_project" {
        let p_val = parse_numeric(
            get_nested_value(data, "الدخل الشهري - معاش")
                .or_else(|| get_nested_value(data, "page4.income.pension"))
                .or_else(|| get_nested_value(data, "page4.pension")),
        );
        let project_keys = [
            "الدخل الشهري - فرشة",
            "الدخل الشهري - كشك",
            "الدخل الشهري - محل",
            "الدخل الشهري - تجارة",
            "الدخل الشهري - تروسيكل",
            "الدخل الشهري - أنابيب",
            "الدخل الشهري - مكنة خياطة",
            "الدخل الشهري - ثلاجة",
            "الدخل الشهري - طيور",
        ];
        let mut proj_sum = 0.0;
        for k in project_keys {
            proj_sum += parse_numeric(data.get(k));
        }
        let total = proj_sum + p_val;
        if total > 0.0 {
            return format!("{:.0}", total);
        }
    }

    if binding == "page4.income.relatives_aid" {
        let w_sal = parse_numeric(get_nested_value(data, "page2.wife.salary"));
        let r_val = parse_numeric(data.get("الدخل الشهري - مساعدات احد الافراد"));
        let total = w_sal + r_val;
        if total > 0.0 {
            return format!("{:.0}", total);
        }
    }

    // Fallback to checking field_id directly
    if !field_id.is_empty() {
        if let Some(val) = data.get(field_id) {
            if let Some(s) = val.as_str() {
                if !s.is_empty() {
                    return s.to_string();
                }
            }
        }
    }

    "".to_string()
}
