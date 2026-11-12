export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const
export function startOfWeek(date: Date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7))
  return result
}
export const weekKey = (date: Date) => {
  const monday = startOfWeek(date)
  const year = monday.getFullYear()
  const month = String(monday.getMonth() + 1).padStart(2, '0')
  const day = String(monday.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
export function addWeeks(anchor: Date, amount: number) {
  const date = startOfWeek(anchor)
  date.setDate(date.getDate() + amount * 7)
  return date
}
export const weekdayIndex = (date: Date) => (date.getDay() + 6) % 7
export const weekdayShort = (date: Date) =>
  WEEKDAYS[weekdayIndex(date)]!.slice(0, 3)
export const isToday = (date: Date) =>
  date.toDateString() === new Date().toDateString()
export function formatWeekRange(anchor: Date) {
  const start = startOfWeek(anchor)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
}
