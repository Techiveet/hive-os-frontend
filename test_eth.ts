import { toEthiopianDate } from './lib/ethiopian-calendar';
const et = toEthiopianDate(new Date('2026-06-04'));
console.log(et.year, et.month, et.day);
