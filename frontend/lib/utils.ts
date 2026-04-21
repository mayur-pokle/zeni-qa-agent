export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) {
    return "Never";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return typeof date === "string" ? date : "Invalid date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsedDate);
}

export function statusTone(value: string) {
  if (value === "DOWN" || value === "FAILED") {
    return "text-[#f5f5f4]";
  }

  if (value === "WARNING") {
    return "text-[#f5f5f4]";
  }

  return "text-[#f5f5f4]";
}
