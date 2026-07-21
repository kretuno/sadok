import React from 'react';
import type { KindergartenSettings } from '../../contexts/SettingsContext';
import type { RecipeDetails } from '../../pages/menu/menuTypes';

interface PrintRecipeTechCardProps {
  data: RecipeDetails;
  settings: KindergartenSettings | null;
}

const ageGroupLabels: Record<string, string> = { common: 'Загальна', '0-4': 'Діти 0–4 років', '5-7': 'Діти 5–7 років' };
const formatWeight = (value: number) => new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(value);

const PrintRecipeTechCard: React.FC<PrintRecipeTechCardProps> = ({ data, settings }) => {
  const { recipe, ingredients } = data;
  return (
    <div className="bg-white p-6 text-[11px] text-black print:p-0">
      <style>{`.tech-card-table { width: 100%; border-collapse: collapse; color: #000; } .tech-card-table td, .tech-card-table th { border: 1px solid #000; padding: 6px 8px; } .tech-card-table th { background: #f3f4f6; font-weight: 700; } .tech-card-center { text-align: center; } .tech-card-right { text-align: right; } .tech-card-label { font-weight: 700; } .tech-card-title { padding: 16px 8px !important; text-align: center; font-size: 20px; font-weight: 900; text-transform: uppercase; } .tech-card-section { margin-top: 20px; } .tech-card-section-title { margin: 0 0 8px; font-size: 14px; font-weight: 900; text-transform: uppercase; } .tech-card-pre { min-height: 96px; white-space: pre-wrap; line-height: 1.5; } .tech-card-signature td { height: 48px; vertical-align: bottom; text-align: center; } @media print { @page { size: A4 portrait; margin: 12mm 10mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .tech-card-table thead { display: table-header-group; } .tech-card-table tr { break-inside: avoid; page-break-inside: avoid; } }`}</style>
      <table className="tech-card-table w-full border border-black text-left">
        <tbody>
          <tr><td colSpan={4} className="tech-card-center tech-card-label">{settings?.name || 'Заклад дошкільної освіти'}</td></tr>
          <tr><td colSpan={4} className="tech-card-center">ЄДРПОУ: {settings?.edrpou || '—'}{settings?.address ? ` · ${settings.address}` : ''}</td></tr>
          <tr><td colSpan={4} className="tech-card-title">Технологічна карта</td></tr>
          <tr><td colSpan={2}><span className="tech-card-label">Назва страви:</span> {recipe.name}</td><td className="tech-card-label">№ рецепта</td><td className="tech-card-center">{recipe.id}</td></tr>
          <tr><td colSpan={2}><span className="tech-card-label">Тип страви:</span> {recipe.dishType || 'Страва'}</td><td className="tech-card-label">Вихід, г</td><td className="tech-card-center">{formatWeight(recipe.outputWeight)}</td></tr>
          <tr><td colSpan={2}><span className="tech-card-label">Кількість інгредієнтів:</span> {ingredients.length}</td><td className="tech-card-label">Дата формування</td><td className="tech-card-center">{new Date().toLocaleDateString('uk-UA')}</td></tr>
        </tbody>
      </table>
      <section className="tech-card-section">
        <h2 className="tech-card-section-title">Сировина на одну порцію</h2>
        <table className="tech-card-table"><thead><tr><th className="tech-card-center">№</th><th>Найменування сировини</th><th>Вікова група</th><th className="tech-card-right">Брутто, г</th><th className="tech-card-right">Нетто, г</th></tr></thead><tbody>
          {ingredients.length > 0 ? ingredients.map((ingredient, index) => <tr key={ingredient.id}><td className="tech-card-center">{index + 1}</td><td>{ingredient.productName || ingredient.subRecipeName || 'Не вказано'}</td><td>{ageGroupLabels[ingredient.ageGroup] || ingredient.ageGroup}</td><td className="tech-card-right">{formatWeight(ingredient.grossWeight)}</td><td className="tech-card-right">{formatWeight(ingredient.netWeight)}</td></tr>) : <tr><td colSpan={5} className="tech-card-center">Склад рецепта не заповнено</td></tr>}
        </tbody></table>
      </section>
      <table className="tech-card-table tech-card-section"><tbody><tr><td className="tech-card-label">Технологія приготування</td></tr><tr><td className="tech-card-pre">{recipe.techCard || 'Технологію приготування не вказано.'}</td></tr></tbody></table>
      <table className="tech-card-table tech-card-section tech-card-signature"><tbody><tr><td>Відповідальна особа</td><td>Керівник закладу</td></tr></tbody></table>
    </div>
  );
};

export default PrintRecipeTechCard;
