export function validPlanningDate(value: string) {
  const match = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d{1,7})?(Z|[+-](\d\d):(\d\d))$/.exec(value);
  if (!match || Number(match[1]) < 1 || !Number.isFinite(Date.parse(value))) {
    return false;
  }
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
  const hours = Number(match[8] ?? 0),
    minutes = Number(match[9] ?? 0);
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3]) &&
    Number(match[4]) < 24 &&
    Number(match[5]) < 60 &&
    Number(match[6]) < 60 &&
    hours <= 14 &&
    minutes < 60 &&
    (hours !== 14 || minutes === 0)
  );
}
