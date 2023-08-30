
export function hhmm(hh: number, mm: number) {
  return new Date(1970, 0, 1, hh, mm);
}

export function jc_to_date(jc: number) {
  switch (jc) {
    case 1:
      return hhmm(8, 30);
    case 2:
      return hhmm(9, 20);
    case 3:
      return hhmm(10, 25);
    case 4:
      return hhmm(11, 15);
    case 5:
      return hhmm(13, 50);
    case 6:
      return hhmm(14, 40);
    case 7:
      return hhmm(15, 30);
    case 8:
      return hhmm(16, 30);
    case 9:
      return hhmm(17, 20);
    case 10:
      return hhmm(18, 30);
    case 11:
      return hhmm(19, 20);
    case 12:
      return hhmm(20, 10);
    default:
      return hhmm(23, 59);
  }
}

export function tdt_to_str(delta: number) {
  let flag = false;
  if (delta < 0) {
    flag = true;
    delta = -delta;
  }
  delta = Math.floor(delta / (60 * 1000)); // millisecond to minute
  let ret = "";
  if (delta > 60 * 24) {
    ret += `${Math.floor(delta / (60 * 24))}d`;
    delta %= 60 * 24;
  }
  if (delta > 60) {
    ret += `${Math.floor(delta / 60)}h`;
    delta %= 60;
  }
  if (delta >= 0) {
    ret += `${delta}m`;
  }
  if (flag) {
    ret = "-" + ret;
  }
  return ret;
}
