import type { MortalityRecord, Product, PurchaseRecord, SaleRecord } from '../types';

function isLiveBird(product: Product) {
  return product.category === 'Live Bird';
}

function sameBirdType(product: Product, purchase: PurchaseRecord) {
  return product.name.trim().toLowerCase() === purchase.birdType.trim().toLowerCase();
}

export function getLiveBirdStock(products: Product[]) {
  return products.filter(isLiveBird).reduce((sum, product) => sum + Math.max(0, Number(product.stock ?? 0)), 0);
}

function getTotalBirdsPurchased(purchases: PurchaseRecord[]) {
  return purchases.reduce((sum, purchase) => sum + Math.max(0, Number(purchase.quantity ?? 0)), 0);
}

function getTotalBirdDeaths(mortalities: MortalityRecord[]) {
  return mortalities.reduce((sum, mortality) => sum + Math.max(0, Number(mortality.quantity ?? 0)), 0);
}

function getBirdExpenseDenominator(products: Product[], purchases: PurchaseRecord[], mortalities: MortalityRecord[]) {
  const purchasedBirds = getTotalBirdsPurchased(purchases);
  const mortalityBirds = getTotalBirdDeaths(mortalities);
  const activeBatchBirds = Math.max(0, purchasedBirds - mortalityBirds);
  if (activeBatchBirds > 0) return activeBatchBirds;
  return getLiveBirdStock(products);
}

function getAveragePurchaseCostForBird(product: Product, purchases: PurchaseRecord[]) {
  const matchingPurchases = purchases.filter((purchase) => sameBirdType(product, purchase));
  const totalQuantity = matchingPurchases.reduce((sum, purchase) => sum + Math.max(0, Number(purchase.quantity ?? 0)), 0);
  if (totalQuantity <= 0) {
    return Math.max(0, Number(product.costPrice ?? 0));
  }
  const totalCost = matchingPurchases.reduce((sum, purchase) => sum + Math.max(0, Number(purchase.totalCost ?? 0)), 0);
  return totalCost / totalQuantity;
}

export function getExpenseCostPerBird(
  products: Product[],
  purchases: PurchaseRecord[],
  mortalities: MortalityRecord[],
  totalExpenses: number
) {
  const denominator = getBirdExpenseDenominator(products, purchases, mortalities);
  if (denominator <= 0) return 0;
  return Math.max(0, totalExpenses) / denominator;
}

export function getCurrentProductCost(
  product: Product,
  products: Product[],
  purchases: PurchaseRecord[],
  mortalities: MortalityRecord[],
  totalExpenses: number
) {
  const baseCost = Math.max(0, getAveragePurchaseCostForBird(product, purchases));
  if (!isLiveBird(product)) {
    return baseCost;
  }
  return baseCost + getExpenseCostPerBird(products, purchases, mortalities, totalExpenses);
}

export function getCurrentLiveBirdCost(
  products: Product[],
  purchases: PurchaseRecord[],
  mortalities: MortalityRecord[],
  totalExpenses: number
) {
  const liveBirds = products.filter(isLiveBird);
  if (!liveBirds.length) return 0;
  const totalStock = liveBirds.reduce((sum, product) => sum + Math.max(0, Number(product.stock ?? 0)), 0);
  if (totalStock > 0) {
    const totalCurrentCost = liveBirds.reduce(
      (sum, product) =>
        sum +
        getCurrentProductCost(product, products, purchases, mortalities, totalExpenses) * Math.max(0, Number(product.stock ?? 0)),
      0
    );
    return totalCurrentCost / totalStock;
  }
  return (
    liveBirds.reduce(
      (sum, product) => sum + getCurrentProductCost(product, products, purchases, mortalities, totalExpenses),
      0
    ) / liveBirds.length
  );
}

export function getSaleEstimatedCost(
  sale: SaleRecord,
  products: Product[],
  purchases: PurchaseRecord[],
  mortalities: MortalityRecord[],
  totalExpenses: number
) {
  const productMap = new Map(products.map((product) => [product.id, product]));
  return sale.items.reduce((sum, item) => {
    const product = productMap.get(item.productId);
    if (!product) return sum;
    return (
      sum +
      getCurrentProductCost(product, products, purchases, mortalities, totalExpenses) *
        Math.max(0, Number(item.qty ?? 0))
    );
  }, 0);
}

export function getSaleEstimatedProfit(
  sale: SaleRecord,
  products: Product[],
  purchases: PurchaseRecord[],
  mortalities: MortalityRecord[],
  totalExpenses: number
) {
  return Math.max(0, Number(sale.total ?? 0) - getSaleEstimatedCost(sale, products, purchases, mortalities, totalExpenses));
}

export function getProfitPerBird(
  product: Product,
  products: Product[],
  purchases: PurchaseRecord[],
  mortalities: MortalityRecord[],
  totalExpenses: number
) {
  return Math.max(
    0,
    Number(product.sellPrice ?? 0) - getCurrentProductCost(product, products, purchases, mortalities, totalExpenses)
  );
}
