import { StyleSheet, Text, View } from 'react-native';
import { peso } from '../data/products';
import { FAINT_BORDER, FONT, INK, MUTED, DEEP } from '../theme';

// Order/cart totals. fee defaults to the demo delivery fee only when the
// caller passes nothing; discount rows render only when a coupon applied.
export default function SummaryRows({ subTotal, fee, discount = 0, total }) {
  return (
    <View style={styles.summary}>
      <View style={styles.row}>
        <Text style={styles.label}>Sub Total</Text>
        <Text style={styles.value}>{peso(subTotal)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Delivery Fee</Text>
        <Text style={styles.value}>{peso(fee)}</Text>
      </View>
      {discount > 0 ? (
        <View style={styles.row}>
          <Text style={styles.label}>Coupon (DISCOUNT20)</Text>
          <Text style={styles.discount}>{"\u2212"}{peso(discount)}</Text>
        </View>
      ) : null}
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.totalLabel}>Total Price</Text>
        <Text style={styles.totalValue}>{peso(total)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 12, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 16, color: MUTED, fontFamily: FONT },
  value: { fontSize: 16, fontWeight: '600', color: INK, fontFamily: FONT },
  discount: { fontSize: 16, fontWeight: '600', color: DEEP, fontFamily: FONT },
  divider: { height: 1, backgroundColor: FAINT_BORDER },
  totalLabel: { fontSize: 16, fontWeight: '700', color: INK, fontFamily: FONT },
  totalValue: { fontSize: 18, fontWeight: '700', color: DEEP, fontFamily: FONT },
});
