import firstStart from './articles/01-first-start.md?raw';
import installationNetwork from './articles/02-installation-network.md?raw';
import settingsUsers from './articles/03-settings-users.md?raw';
import childrenAttendance from './articles/04-children-attendance.md?raw';
import employees from './articles/05-employees.md?raw';
import menuInventory from './articles/06-menu-inventory.md?raw';
import medicalPsychologist from './articles/07-medical-psychologist.md?raw';
import propertyUtilities from './articles/08-property-utilities.md?raw';
import reportsCommunication from './articles/09-reports-communication.md?raw';
import backups from './articles/10-backups.md?raw';
import licenseUpdates from './articles/11-license-updates.md?raw';
import troubleshootingSupport from './articles/12-troubleshooting-support.md?raw';
import type { HelpArticle } from './helpSearch';

export interface HelpCatalogArticle extends HelpArticle {
  number: string;
}

export const helpArticles: HelpCatalogArticle[] = [
  { id: 'first-start', number: '01', title: 'Перший запуск SADOK', description: 'Роль компʼютера, перший вхід і початкове налаштування.', keywords: ['початок', 'сервер', 'клієнт', 'вхід', 'налаштування'], content: firstStart },
  { id: 'installation-network', number: '02', title: 'Встановлення та робота в мережі', description: 'Серверні й клієнтські робочі місця, мережа та перенесення.', keywords: ['встановлення', 'мережа', 'сервер', 'клієнт', 'перенесення'], content: installationNetwork },
  { id: 'settings-users', number: '03', title: 'Налаштування, користувачі та права', description: 'Дані закладу, облікові записи, ролі й безпечний доступ.', keywords: ['користувач', 'пароль', 'права', 'роль', 'адміністратор'], content: settingsUsers },
  { id: 'children-attendance', number: '04', title: 'Діти, групи та відвідування', description: 'Картки дітей, переведення між групами та щоденний облік.', keywords: ['дитина', 'група', 'відвідування', 'присутність', 'батьки'], content: childrenAttendance },
  { id: 'employees', number: '05', title: 'Працівники та документи', description: 'Картки працівників, документи, майно та звільнення.', keywords: ['працівник', 'співробітник', 'посада', 'документ', 'звільнення'], content: employees },
  { id: 'menu-inventory', number: '06', title: 'Склад, продукти та меню', description: 'Надходження, залишки, рецептури, підтвердження й повернення.', keywords: ['склад', 'продукти', 'меню', 'рецепт', 'списання', 'залишок'], content: menuInventory },
  { id: 'medical-psychologist', number: '07', title: 'Медичний кабінет і психолог', description: 'Медичні картки, щеплення, медикаменти та конфіденційність.', keywords: ['медицина', 'щеплення', 'ліки', 'психолог', 'медикаменти'], content: medicalPsychologist },
  { id: 'property-utilities', number: '08', title: 'Майно та комунальні показники', description: 'Інвентарні картки, передача, списання та лічильники.', keywords: ['майно', 'інвентар', 'комунальні', 'лічильник', 'передача'], content: propertyUtilities },
  { id: 'reports-communication', number: '09', title: 'Звіти, сповіщення та внутрішній чат', description: 'Формування звітів і щоденна робоча комунікація.', keywords: ['звіт', 'друк', 'експорт', 'сповіщення', 'чат'], content: reportsCommunication },
  { id: 'backups', number: '10', title: 'Резервне копіювання та відновлення', description: 'Графік копіювання, створення, перевірка й безпечне відновлення.', keywords: ['резервна копія', 'архів', 'база', 'відновлення', 'backup'], content: backups },
  { id: 'license-updates', number: '11', title: 'Ліцензія та оновлення SADOK', description: 'Активація, строк дії, перевипуск токена та оновлення.', keywords: ['ліцензія', 'активація', 'ключ', 'токен', 'оновлення'], content: licenseUpdates },
  { id: 'troubleshooting-support', number: '12', title: 'Вирішення проблем і технічна підтримка', description: 'Типові помилки, самостійна перевірка та якісне звернення.', keywords: ['помилка', 'підтримка', 'не працює', 'сервер', 'допомога'], content: troubleshootingSupport },
];
