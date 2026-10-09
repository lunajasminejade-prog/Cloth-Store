import { FlatList, StyleSheet, View } from 'react-native';
import ProductCard from './ProductCard';

// Virtualized product grid (FlatList) retaining the original card appearance
// and responsive column count.
export default function ProductGrid({
  list,
  gap,
  cardW,
  cols = 2,
  favorites,
  onOpen,
  onToggleFav,
  emptyNode,
  headerNode,
}) {
  return (
    <FlatList
      data={list}
      keyExtractor={(p) => String(p.id)}
      numColumns={cols}
      key={cols}
      columnWrapperStyle={cols > 1 ? { gap } : undefined}
      contentContainerStyle={[styles.content, { gap }]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={headerNode || null}
      ListEmptyComponent={emptyNode || null}
      renderItem={({ item }) => (
        <ProductCard
          product={item}
          width={cardW}
          fav={!!favorites[item.id]}
          onOpen={onOpen}
          onToggleFav={onToggleFav}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { marginTop: 16, paddingBottom: 8 },
});
