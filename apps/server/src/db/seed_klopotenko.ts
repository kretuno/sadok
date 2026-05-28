import { db } from './index';
import { products, recipeIngredients, recipes } from './schema';
import { eq } from 'drizzle-orm';

async function seedKlopotenko() {
  console.log('🌱 Починаємо завантаження бази рецептів Євгена Клопотенка...');

  const data = [
    {
      name: 'Борщ зі сливовим варенням',
      dishType: 'Перша страва',
      outputWeight: 200,
      ingredients: [
        { name: 'Буряк', gross: 40, net: 32, unit: 'кг' },
        { name: 'Капуста свіжа', gross: 40, net: 32, unit: 'кг' },
        { name: 'Картопля', gross: 50, net: 37, unit: 'кг' },
        { name: 'Морква', gross: 10, net: 8, unit: 'кг' },
        { name: 'Цибуля ріпчаста', gross: 10, net: 8, unit: 'кг' },
        { name: 'Варення сливове', gross: 15, net: 15, unit: 'кг' },
        { name: 'Томатна паста', gross: 5, net: 5, unit: 'кг' },
        { name: 'Олія соняшникова', gross: 5, net: 5, unit: 'кг' },
      ]
    },
    {
      name: 'Суп-пюре з сочевиці',
      dishType: 'Перша страва',
      outputWeight: 200,
      ingredients: [
        { name: 'Сочевиця червона', gross: 30, net: 30, unit: 'кг' },
        { name: 'Картопля', gross: 40, net: 30, unit: 'кг' },
        { name: 'Морква', gross: 15, net: 12, unit: 'кг' },
        { name: 'Цибуля ріпчаста', gross: 10, net: 8, unit: 'кг' },
        { name: 'Куркума', gross: 0.1, net: 0.1, unit: 'кг' },
      ]
    },
    {
      name: 'Куліш з куркою',
      dishType: 'Друга страва',
      outputWeight: 150,
      ingredients: [
        { name: 'Пшоно', gross: 30, net: 30, unit: 'кг' },
        { name: 'М\'ясо курки (філе)', gross: 60, net: 55, unit: 'кг' },
        { name: 'Морква', gross: 15, net: 12, unit: 'кг' },
        { name: 'Цибуля ріпчаста', gross: 10, net: 8, unit: 'кг' },
        { name: 'Олія соняшникова', gross: 5, net: 5, unit: 'кг' },
      ]
    },
    {
      name: 'Рибні нагетси (запечені)',
      dishType: 'Друга страва',
      outputWeight: 80,
      ingredients: [
        { name: 'Філе минтая', gross: 100, net: 90, unit: 'кг' },
        { name: 'Сухарі панірувальні', gross: 10, net: 10, unit: 'кг' },
        { name: 'Яйця курячі', gross: 5, net: 5, unit: 'шт' },
        { name: 'Куркума', gross: 0.1, net: 0.1, unit: 'кг' },
      ]
    },
    {
      name: 'Рис з овочами (Паелья)',
      dishType: 'Гарнір',
      outputWeight: 150,
      ingredients: [
        { name: 'Рис', gross: 50, net: 50, unit: 'кг' },
        { name: 'Зелений горошок (зам)', gross: 20, net: 20, unit: 'кг' },
        { name: 'Кукурудза (зам)', gross: 20, net: 20, unit: 'кг' },
        { name: 'Морква', gross: 15, net: 12, unit: 'кг' },
        { name: 'Олія соняшникова', gross: 5, net: 5, unit: 'кг' },
      ]
    },
    {
      name: 'Салат з буряком та чорносливом',
      dishType: 'Салат',
      outputWeight: 60,
      ingredients: [
        { name: 'Буряк', gross: 50, net: 48, unit: 'кг' },
        { name: 'Чорнослив', gross: 10, net: 10, unit: 'кг' },
        { name: 'Олія соняшникова', gross: 3, net: 3, unit: 'кг' },
      ]
    },
    {
        name: 'Котлети курячі з овочами',
        dishType: 'Друга страва',
        outputWeight: 70,
        ingredients: [
          { name: 'М\'ясо курки (філе)', gross: 60, net: 58, unit: 'кг' },
          { name: 'Морква', gross: 15, net: 12, unit: 'кг' },
          { name: 'Цибуля ріпчаста', gross: 10, net: 8, unit: 'кг' },
          { name: 'Яйця курячі', gross: 4, net: 4, unit: 'шт' },
        ]
    },
    {
        name: 'Сирна запіканка з яблуками',
        dishType: 'Сніданок',
        outputWeight: 150,
        ingredients: [
          { name: 'Сир кисломолочний', gross: 100, net: 100, unit: 'кг' },
          { name: 'Яблука свіжі', gross: 40, net: 30, unit: 'кг' },
          { name: 'Манна крупа', gross: 10, net: 10, unit: 'кг' },
          { name: 'Яйця курячі', gross: 10, net: 10, unit: 'шт' },
          { name: 'Сметана', gross: 10, net: 10, unit: 'кг' },
        ]
    },
    {
        name: 'Верещака (свинина запечена)',
        dishType: 'Друга страва',
        outputWeight: 100,
        ingredients: [
          { name: 'Свинина (нежирна)', gross: 120, net: 110, unit: 'кг' },
          { name: 'Квас буряковий', gross: 30, net: 30, unit: 'л' },
          { name: 'Часник', gross: 2, net: 1, unit: 'кг' },
          { name: 'Чебрець', gross: 0.1, net: 0.1, unit: 'кг' },
        ]
    },
    {
        name: 'Шпундра (свинина з буряком)',
        dishType: 'Друга страва',
        outputWeight: 120,
        ingredients: [
          { name: 'Свинина (нежирна)', gross: 80, net: 75, unit: 'кг' },
          { name: 'Буряк', gross: 100, net: 80, unit: 'кг' },
          { name: 'Цибуля ріпчаста', gross: 15, net: 12, unit: 'кг' },
          { name: 'Томатна паста', gross: 10, net: 10, unit: 'кг' },
        ]
    },
    {
        name: 'Чай з лимоном (без цукру)',
        dishType: 'Напій',
        outputWeight: 180,
        ingredients: [
          { name: 'Чай чорний', gross: 0.5, net: 0.5, unit: 'кг' },
          { name: 'Лимон', gross: 10, net: 7, unit: 'кг' },
          { name: 'Вода', gross: 180, net: 180, unit: 'л' },
        ]
    },
    {
        name: 'Узвар з сухофруктів',
        dishType: 'Напій',
        outputWeight: 200,
        ingredients: [
          { name: 'Сухофрукти (суміш)', gross: 25, net: 25, unit: 'кг' },
          { name: 'Вода', gross: 200, net: 200, unit: 'л' },
          { name: 'Мед', gross: 5, net: 5, unit: 'кг' },
        ]
    },
    {
        name: 'Полента з сиром',
        dishType: 'Гарнір',
        outputWeight: 150,
        ingredients: [
          { name: 'Крупа кукурудзяна', gross: 40, net: 40, unit: 'кг' },
          { name: 'Сир твердий', gross: 15, net: 15, unit: 'кг' },
          { name: 'Вершкове масло', gross: 5, net: 5, unit: 'кг' },
        ]
    },
    {
        name: 'Банш (кукурудзяна каша)',
        dishType: 'Сніданок',
        outputWeight: 180,
        ingredients: [
          { name: 'Крупа кукурудзяна', gross: 40, net: 40, unit: 'кг' },
          { name: 'Молоко', gross: 100, net: 100, unit: 'л' },
          { name: 'Сметана', gross: 20, net: 20, unit: 'кг' },
          { name: 'Сир твердий', gross: 10, net: 10, unit: 'кг' },
        ]
    },
    {
        name: 'Тефтелі яловичі в соусі',
        dishType: 'Друга страва',
        outputWeight: 90,
        ingredients: [
          { name: 'Яловичина (фарш)', gross: 80, net: 75, unit: 'кг' },
          { name: 'Рис', gross: 15, net: 15, unit: 'кг' },
          { name: 'Цибуля ріпчаста', gross: 10, net: 8, unit: 'кг' },
          { name: 'Томатна паста', gross: 10, net: 10, unit: 'кг' },
        ]
    },
    {
        name: 'Нагетси курячі в духовці',
        dishType: 'Друга страва',
        outputWeight: 80,
        ingredients: [
          { name: 'М\'ясо курки (філе)', gross: 100, net: 95, unit: 'кг' },
          { name: 'Пластівці вівсяні', gross: 15, net: 15, unit: 'кг' },
          { name: 'Яйця курячі', gross: 5, net: 5, unit: 'шт' },
        ]
    },
    {
        name: 'Салат з капусти з насінням гарбуза',
        dishType: 'Салат',
        outputWeight: 60,
        ingredients: [
          { name: 'Капуста свіжа', gross: 60, net: 50, unit: 'кг' },
          { name: 'Насіння гарбуза', gross: 5, net: 5, unit: 'кг' },
          { name: 'Олія соняшникова', gross: 5, net: 5, unit: 'кг' },
          { name: 'Лимонний сік', gross: 2, net: 2, unit: 'л' },
        ]
    },
    {
        name: 'Пастуший пиріг з сочевицею',
        dishType: 'Друга страва',
        outputWeight: 180,
        ingredients: [
          { name: 'Сочевиця червона', gross: 40, net: 40, unit: 'кг' },
          { name: 'Картопля (пюре)', gross: 100, net: 80, unit: 'кг' },
          { name: 'Морква', gross: 15, net: 12, unit: 'кг' },
          { name: 'Цибуля ріпчаста', gross: 10, net: 8, unit: 'кг' },
        ]
    },
    {
        name: 'Яблуко запечене з сиром',
        dishType: 'Полуденок',
        outputWeight: 120,
        ingredients: [
          { name: 'Яблука свіжі', gross: 130, net: 100, unit: 'кг' },
          { name: 'Сир кисломолочний', gross: 30, net: 30, unit: 'кг' },
          { name: 'Родзинки', gross: 5, net: 5, unit: 'кг' },
          { name: 'Мед', gross: 5, net: 5, unit: 'кг' },
        ]
    },
    {
        name: 'Котлети рибні з соусом бешамель',
        dishType: 'Друга страва',
        outputWeight: 90,
        ingredients: [
          { name: 'Філе минтая', gross: 100, net: 90, unit: 'кг' },
          { name: 'Цибуля ріпчаста', gross: 10, net: 8, unit: 'кг' },
          { name: 'Молоко', gross: 20, net: 20, unit: 'л' },
          { name: 'Борошно пшеничне', gross: 5, net: 5, unit: 'кг' },
          { name: 'Вершкове масло', gross: 5, net: 5, unit: 'кг' },
        ]
    },
    {
        name: 'Гарбузова каша з рисом',
        dishType: 'Сніданок',
        outputWeight: 180,
        ingredients: [
          { name: 'Гарбуз свіжий', gross: 80, net: 60, unit: 'кг' },
          { name: 'Рис', gross: 30, net: 30, unit: 'кг' },
          { name: 'Молоко', gross: 100, net: 100, unit: 'л' },
          { name: 'Вершкове масло', gross: 5, net: 5, unit: 'кг' },
        ]
    },
    {
        name: 'Стіки курячі в паприці',
        dishType: 'Друга страва',
        outputWeight: 80,
        ingredients: [
          { name: 'М\'ясо курки (філе)', gross: 100, net: 95, unit: 'кг' },
          { name: 'Паприка мелена', gross: 1, net: 1, unit: 'кг' },
          { name: 'Олія соняшникова', gross: 5, net: 5, unit: 'кг' },
        ]
    },
    {
        name: 'Салат "Панзанелла" (з сухариками)',
        dishType: 'Салат',
        outputWeight: 80,
        ingredients: [
          { name: 'Помідори свіжі', gross: 40, net: 35, unit: 'кг' },
          { name: 'Огірки свіжі', gross: 30, net: 25, unit: 'кг' },
          { name: 'Хліб цільнозерновий (сухарики)', gross: 15, net: 15, unit: 'кг' },
          { name: 'Олія соняшникова', gross: 5, net: 5, unit: 'кг' },
        ]
    },
    {
        name: 'Рис з сочевицею (Муджадара)',
        dishType: 'Гарнір',
        outputWeight: 150,
        ingredients: [
          { name: 'Рис', gross: 40, net: 40, unit: 'кг' },
          { name: 'Сочевиця червона', gross: 30, net: 30, unit: 'кг' },
          { name: 'Цибуля ріпчаста (смажена)', gross: 20, net: 15, unit: 'кг' },
          { name: 'Олія соняшникова', gross: 5, net: 5, unit: 'кг' },
        ]
    },
    {
        name: 'Кисіль ягідний',
        dishType: 'Напій',
        outputWeight: 180,
        ingredients: [
          { name: 'Ягоди зам. (смородина, малина)', gross: 30, net: 30, unit: 'кг' },
          { name: 'Крохмаль кукурудзяний', gross: 10, net: 10, unit: 'кг' },
          { name: 'Вода', gross: 180, net: 180, unit: 'л' },
        ]
    }
  ];

  try {
    for (const item of data) {
      // 1. Створюємо або отримуємо продукти
      const ingredientIds = [];
      for (const ing of item.ingredients) {
        let product = await db.query.products.findFirst({
          where: eq(products.name, ing.name),
        });

        if (!product) {
          const inserted = await db.insert(products).values({
            name: ing.name,
            unit: ing.unit,
            category: 'База Клопотенка',
          }).returning();
          product = inserted[0];
        }
        ingredientIds.push({ id: product.id, gross: ing.gross, net: ing.net });
      }

      // 2. Створюємо рецепт
      const insertedRecipe = await db.insert(recipes).values({
        name: item.name,
        dishType: item.dishType,
        outputWeight: item.outputWeight,
        isBaseRecipe: true,
      }).returning();

      const recipeId = insertedRecipe[0].id;

      // 3. Додаємо інгредієнти до рецепта (для обох вікових груп однаково як базове)
      for (const ingData of ingredientIds) {
        await db.insert(recipeIngredients).values({
          recipeId,
          productId: ingData.id,
          grossWeight: String(ingData.gross),
          netWeight: String(ingData.net),
          ageGroup: 'common',
        });
      }
      
      console.log(`✅ Рецепт "${item.name}" додано.`);
    }

    console.log('✨ Базу успішно оновлено!');
  } catch (error) {
    console.error('❌ Помилка сидування:', error);
  } finally {
    process.exit();
  }
}

seedKlopotenko();
