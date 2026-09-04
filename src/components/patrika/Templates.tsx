import React from 'react';
import { View, StyleSheet, Text, ImageBackground } from 'react-native';

export interface PatrikaProps {
  brideName: string;
  groomName: string;
  date: string;
  venue: string;
  message: string;
  photoUri?: string;
  accentColor?: string;
  width?: number; // for scaling in preview
  fontScale?: number; // User controlled scale
}

// Helper to scale fonts if needed based on container width and user scale
const sf = (size: number, width: number = 350, fontScale: number = 1.0) => ((size * width) / 350) * fontScale;

// 1. The Classic
const TemplateClassic = (props: PatrikaProps) => (
  <View style={[styles.t1_container, { width: props.width || 350, height: (props.width || 350) * 1.5 }]}>
    <View style={styles.t1_border}>
      <Text style={[styles.t1_title, { fontSize: sf(32, props.width, props.fontScale) }]}>{props.brideName}</Text>
      <Text style={[styles.t1_and, { fontSize: sf(20, props.width, props.fontScale) }]}>&</Text>
      <Text style={[styles.t1_title, { fontSize: sf(32, props.width, props.fontScale) }]}>{props.groomName}</Text>
      
      <View style={styles.t1_divider} />
      
      <Text style={[styles.t1_text, { fontSize: sf(14, props.width, props.fontScale) }]}>{props.message}</Text>
      <Text style={[styles.t1_date, { fontSize: sf(16, props.width, props.fontScale) }]}>{props.date}</Text>
      <Text style={[styles.t1_text, { fontSize: sf(14, props.width, props.fontScale) }]}>{props.venue}</Text>
    </View>
  </View>
);

// 2. Modern Minimalist
const TemplateModern = (props: PatrikaProps) => (
  <View style={[styles.t2_container, { width: props.width || 350, height: (props.width || 350) * 1.5 }]}>
    <Text style={[styles.t2_invite, { fontSize: sf(12, props.width, props.fontScale) }]}>YOU ARE INVITED</Text>
    <View style={styles.t2_namesBox}>
      <Text style={[styles.t2_name, { fontSize: sf(40, props.width, props.fontScale) }]}>{props.brideName.toUpperCase()}</Text>
      <Text style={[styles.t2_name, { fontSize: sf(40, props.width, props.fontScale) }]}>{props.groomName.toUpperCase()}</Text>
    </View>
    <View style={styles.t2_bottom}>
      <Text style={[styles.t2_date, { fontSize: sf(14, props.width, props.fontScale) }]}>{props.date}</Text>
      <Text style={[styles.t2_venue, { fontSize: sf(12, props.width, props.fontScale) }]}>{props.venue}</Text>
    </View>
  </View>
);

// 3. Royal Heritage
const TemplateRoyal = (props: PatrikaProps) => (
  <View style={[styles.t3_container, { width: props.width || 350, height: (props.width || 350) * 1.5 }]}>
    <View style={styles.t3_inner}>
      <Text style={[styles.t3_header, { fontSize: sf(14, props.width, props.fontScale) }]}>With great joy</Text>
      <Text style={[styles.t3_name, { fontSize: sf(36, props.width, props.fontScale) }]}>{props.brideName}</Text>
      <Text style={[styles.t3_and, { fontSize: sf(18, props.width, props.fontScale) }]}>WEDS</Text>
      <Text style={[styles.t3_name, { fontSize: sf(36, props.width, props.fontScale) }]}>{props.groomName}</Text>
      <View style={styles.t3_divider} />
      <Text style={[styles.t3_date, { fontSize: sf(16, props.width, props.fontScale) }]}>{props.date}</Text>
      <Text style={[styles.t3_venue, { fontSize: sf(12, props.width, props.fontScale) }]}>{props.venue}</Text>
    </View>
  </View>
);

// 4. Floral Pastel
const TemplatePastel = (props: PatrikaProps) => (
  <View style={[styles.t4_container, { width: props.width || 350, height: (props.width || 350) * 1.5 }]}>
    <View style={styles.t4_card}>
      <Text style={[styles.t4_name, { fontSize: sf(28, props.width, props.fontScale) }]}>{props.brideName}</Text>
      <Text style={[styles.t4_and, { fontSize: sf(24, props.width, props.fontScale) }]}>&</Text>
      <Text style={[styles.t4_name, { fontSize: sf(28, props.width, props.fontScale) }]}>{props.groomName}</Text>
      <Text style={[styles.t4_date, { fontSize: sf(16, props.width, props.fontScale), marginTop: sf(20, props.width, props.fontScale) }]}>{props.date}</Text>
      <Text style={[styles.t4_venue, { fontSize: sf(12, props.width, props.fontScale) }]}>{props.venue}</Text>
    </View>
  </View>
);

// 5. Night Sky
const TemplateNight = (props: PatrikaProps) => (
  <View style={[styles.t5_container, { width: props.width || 350, height: (props.width || 350) * 1.5 }]}>
    <View style={styles.t5_stars} />
    <Text style={[styles.t5_title, { fontSize: sf(24, props.width, props.fontScale) }]}>Celebrate with us</Text>
    <Text style={[styles.t5_name, { fontSize: sf(40, props.width, props.fontScale) }]}>{props.brideName}</Text>
    <Text style={[styles.t5_name, { fontSize: sf(40, props.width, props.fontScale) }]}>{props.groomName}</Text>
    <View style={styles.t5_line} />
    <Text style={[styles.t5_date, { fontSize: sf(14, props.width, props.fontScale) }]}>{props.date}</Text>
    <Text style={[styles.t5_venue, { fontSize: sf(12, props.width, props.fontScale) }]}>{props.venue}</Text>
  </View>
);

// 6. Vibrant Celebration
const TemplateVibrant = (props: PatrikaProps) => (
  <View style={[styles.t6_container, { width: props.width || 350, height: (props.width || 350) * 1.5 }]}>
    <Text style={[styles.t6_header, { fontSize: sf(16, props.width, props.fontScale) }]}>JOIN THE CELEBRATION</Text>
    <View style={styles.t6_box}>
      <Text style={[styles.t6_name, { fontSize: sf(32, props.width, props.fontScale) }]}>{props.brideName}</Text>
      <Text style={[styles.t6_and, { fontSize: sf(20, props.width, props.fontScale) }]}>+</Text>
      <Text style={[styles.t6_name, { fontSize: sf(32, props.width, props.fontScale) }]}>{props.groomName}</Text>
    </View>
    <Text style={[styles.t6_date, { fontSize: sf(18, props.width, props.fontScale) }]}>{props.date}</Text>
    <Text style={[styles.t6_venue, { fontSize: sf(14, props.width, props.fontScale) }]}>{props.venue}</Text>
  </View>
);

// 7. Elegant Glass
const TemplateGlass = (props: PatrikaProps) => (
  <View style={[{ width: props.width || 350, height: (props.width || 350) * 1.5, backgroundColor: '#d1d5db' }]}>
    {props.photoUri ? (
      <ImageBackground source={{ uri: props.photoUri }} style={styles.t7_bg}>
        <View style={styles.t7_glass}>
          <Text style={[styles.t7_name, { fontSize: sf(28, props.width, props.fontScale) }]}>{props.brideName}</Text>
          <Text style={[styles.t7_and, { fontSize: sf(16, props.width, props.fontScale) }]}>and</Text>
          <Text style={[styles.t7_name, { fontSize: sf(28, props.width, props.fontScale) }]}>{props.groomName}</Text>
          <Text style={[styles.t7_date, { fontSize: sf(14, props.width, props.fontScale) }]}>{props.date}</Text>
        </View>
      </ImageBackground>
    ) : (
      <View style={[styles.t7_bg, { backgroundColor: '#9ca3af' }]}>
        <View style={styles.t7_glass}>
          <Text style={[styles.t7_name, { fontSize: sf(28, props.width, props.fontScale) }]}>{props.brideName}</Text>
          <Text style={[styles.t7_and, { fontSize: sf(16, props.width, props.fontScale) }]}>and</Text>
          <Text style={[styles.t7_name, { fontSize: sf(28, props.width, props.fontScale) }]}>{props.groomName}</Text>
          <Text style={[styles.t7_date, { fontSize: sf(14, props.width, props.fontScale) }]}>{props.date}</Text>
        </View>
      </View>
    )}
  </View>
);

// 8. Monochrome Chic
const TemplateMonochrome = (props: PatrikaProps) => (
  <View style={[styles.t8_container, { width: props.width || 350, height: (props.width || 350) * 1.5 }]}>
    <View style={styles.t8_stripe} />
    <Text style={[styles.t8_name, { fontSize: sf(36, props.width, props.fontScale) }]}>{props.brideName}</Text>
    <Text style={[styles.t8_name, { fontSize: sf(36, props.width, props.fontScale) }]}>{props.groomName}</Text>
    <Text style={[styles.t8_date, { fontSize: sf(16, props.width, props.fontScale) }]}>{props.date}</Text>
    <Text style={[styles.t8_venue, { fontSize: sf(12, props.width, props.fontScale) }]}>{props.venue}</Text>
  </View>
);

// 9. Cultural Traditional
const TemplateTraditional = (props: PatrikaProps) => (
  <View style={[styles.t9_container, { width: props.width || 350, height: (props.width || 350) * 1.5 }]}>
    <View style={styles.t9_arch}>
      <Text style={[styles.t9_name, { fontSize: sf(26, props.width, props.fontScale) }]}>{props.brideName}</Text>
      <Text style={[styles.t9_and, { fontSize: sf(14, props.width, props.fontScale) }]}>sang</Text>
      <Text style={[styles.t9_name, { fontSize: sf(26, props.width, props.fontScale) }]}>{props.groomName}</Text>
      <View style={styles.t9_line} />
      <Text style={[styles.t9_date, { fontSize: sf(14, props.width, props.fontScale) }]}>{props.date}</Text>
      <Text style={[styles.t9_venue, { fontSize: sf(12, props.width, props.fontScale) }]}>{props.venue}</Text>
    </View>
  </View>
);

// 10. Contemporary Photo
const TemplatePhoto = (props: PatrikaProps) => (
  <View style={[{ width: props.width || 350, height: (props.width || 350) * 1.5, backgroundColor: '#000' }]}>
    {props.photoUri ? (
      <ImageBackground source={{ uri: props.photoUri }} style={styles.t10_bg}>
        <View style={styles.t10_overlay}>
          <Text style={[styles.t10_name, { fontSize: sf(40, props.width, props.fontScale) }]}>{props.brideName}</Text>
          <Text style={[styles.t10_name, { fontSize: sf(40, props.width, props.fontScale) }]}>{props.groomName}</Text>
          <Text style={[styles.t10_date, { fontSize: sf(16, props.width, props.fontScale) }]}>{props.date}</Text>
        </View>
      </ImageBackground>
    ) : (
      <View style={[styles.t10_bg, { backgroundColor: '#374151' }]}>
        <View style={styles.t10_overlay}>
          <Text style={[styles.t10_name, { fontSize: sf(40, props.width, props.fontScale) }]}>{props.brideName}</Text>
          <Text style={[styles.t10_name, { fontSize: sf(40, props.width, props.fontScale) }]}>{props.groomName}</Text>
          <Text style={[styles.t10_date, { fontSize: sf(16, props.width, props.fontScale) }]}>{props.date}</Text>
        </View>
      </View>
    )}
  </View>
);



// 11. Minimalist Gold
const TemplateGold = (props: PatrikaProps) => (
  <View style={[styles.t11_container, { width: props.width || 350, height: (props.width || 350) * 1.5 }]}>
    <View style={styles.t11_border}>
      <Text style={[styles.t11_name, { fontSize: sf(32, props.width, props.fontScale) }]}>{props.brideName}</Text>
      <Text style={[styles.t11_and, { fontSize: sf(16, props.width, props.fontScale) }]}>&</Text>
      <Text style={[styles.t11_name, { fontSize: sf(32, props.width, props.fontScale) }]}>{props.groomName}</Text>
      <View style={styles.t11_divider} />
      <Text style={[styles.t11_date, { fontSize: sf(14, props.width, props.fontScale) }]}>{props.date}</Text>
      <Text style={[styles.t11_venue, { fontSize: sf(12, props.width, props.fontScale) }]}>{props.venue}</Text>
    </View>
  </View>
);

// 12. Watercolor Blush
const TemplateWatercolor = (props: PatrikaProps) => (
  <View style={[styles.t12_container, { width: props.width || 350, height: (props.width || 350) * 1.5 }]}>
    <Text style={[styles.t12_header, { fontSize: sf(16, props.width, props.fontScale) }]}>Together with their families</Text>
    <Text style={[styles.t12_name, { fontSize: sf(38, props.width, props.fontScale) }]}>{props.brideName}</Text>
    <Text style={[styles.t12_and, { fontSize: sf(24, props.width, props.fontScale) }]}>and</Text>
    <Text style={[styles.t12_name, { fontSize: sf(38, props.width, props.fontScale) }]}>{props.groomName}</Text>
    <Text style={[styles.t12_date, { fontSize: sf(16, props.width, props.fontScale) }]}>{props.date}</Text>
    <Text style={[styles.t12_venue, { fontSize: sf(14, props.width, props.fontScale) }]}>{props.venue}</Text>
  </View>
);

// 13. Dark Elegance
const TemplateDarkElegance = (props: PatrikaProps) => (
  <View style={[styles.t13_container, { width: props.width || 350, height: (props.width || 350) * 1.5 }]}>
    <View style={styles.t13_circle}>
      <Text style={[styles.t13_name, { fontSize: sf(28, props.width, props.fontScale) }]}>{props.brideName}</Text>
      <Text style={[styles.t13_and, { fontSize: sf(14, props.width, props.fontScale) }]}>WITH</Text>
      <Text style={[styles.t13_name, { fontSize: sf(28, props.width, props.fontScale) }]}>{props.groomName}</Text>
    </View>
    <Text style={[styles.t13_date, { fontSize: sf(14, props.width, props.fontScale) }]}>{props.date}</Text>
    <Text style={[styles.t13_venue, { fontSize: sf(12, props.width, props.fontScale) }]}>{props.venue}</Text>
  </View>
);

// 14. Modern Geometric
const TemplateGeometric = (props: PatrikaProps) => (
  <View style={[styles.t14_container, { width: props.width || 350, height: (props.width || 350) * 1.5 }]}>
    <View style={styles.t14_diamond}>
      <Text style={[styles.t14_name, { fontSize: sf(24, props.width, props.fontScale) }]}>{props.brideName.toUpperCase()}</Text>
      <Text style={[styles.t14_name, { fontSize: sf(24, props.width, props.fontScale) }]}>{props.groomName.toUpperCase()}</Text>
    </View>
    <View style={styles.t14_bottom}>
      <Text style={[styles.t14_date, { fontSize: sf(14, props.width, props.fontScale) }]}>{props.date}</Text>
      <Text style={[styles.t14_venue, { fontSize: sf(12, props.width, props.fontScale) }]}>{props.venue}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  // 1
  t1_container: { backgroundColor: '#fff', padding: 20, justifyContent: 'center' },
  t1_border: { flex: 1, borderWidth: 2, borderColor: '#D4AF37', padding: 20, alignItems: 'center', justifyContent: 'center' },
  t1_title: { fontFamily: 'serif', color: '#333', textAlign: 'center' },
  t1_and: { fontFamily: 'serif', color: '#D4AF37', marginVertical: 10, fontStyle: 'italic' },
  t1_divider: { width: 40, height: 1, backgroundColor: '#D4AF37', marginVertical: 20 },
  t1_text: { fontFamily: 'serif', color: '#666', textAlign: 'center', marginVertical: 5 },
  t1_date: { fontFamily: 'serif', color: '#333', textAlign: 'center', marginVertical: 10, fontWeight: 'bold' },
  
  // 2
  t2_container: { backgroundColor: '#FAFAFA', padding: 30, justifyContent: 'space-between' },
  t2_invite: { fontWeight: 'bold', color: '#999', letterSpacing: 2 },
  t2_namesBox: { flex: 1, justifyContent: 'center' },
  t2_name: { fontWeight: '900', color: '#111', lineHeight: 44 },
  t2_bottom: { borderTopWidth: 2, borderColor: '#111', paddingTop: 10 },
  t2_date: { fontWeight: 'bold', color: '#111' },
  t2_venue: { color: '#666', marginTop: 5 },

  // 3
  t3_container: { backgroundColor: '#7A1C29', padding: 16 },
  t3_inner: { flex: 1, borderWidth: 1, borderColor: '#E8C37C', padding: 20, alignItems: 'center', justifyContent: 'center' },
  t3_header: { color: '#E8C37C', fontStyle: 'italic', marginBottom: 20 },
  t3_name: { color: '#FFF', fontFamily: 'serif', textAlign: 'center' },
  t3_and: { color: '#E8C37C', letterSpacing: 4, marginVertical: 15 },
  t3_divider: { width: 60, height: 1, backgroundColor: '#E8C37C', marginVertical: 20 },
  t3_date: { color: '#E8C37C', fontWeight: 'bold' },
  t3_venue: { color: '#E8C37C', opacity: 0.8, marginTop: 10, textAlign: 'center' },

  // 4
  t4_container: { backgroundColor: '#FDFBF7', padding: 20 },
  t4_card: { flex: 1, backgroundColor: '#F3E8E6', borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 20 },
  t4_name: { color: '#5C4A4D', fontFamily: 'serif', fontStyle: 'italic' },
  t4_and: { color: '#8BA390', marginVertical: 10 },
  t4_date: { color: '#5C4A4D', fontWeight: '600' },
  t4_venue: { color: '#5C4A4D', textAlign: 'center', marginTop: 10 },

  // 5
  t5_container: { backgroundColor: '#0B132B', padding: 30, alignItems: 'center', justifyContent: 'center' },
  t5_stars: { position: 'absolute', top: 20, right: 20, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF', shadowColor: '#FFF', shadowRadius: 4, shadowOpacity: 1 },
  t5_title: { color: '#FFF', fontStyle: 'italic', marginBottom: 30, opacity: 0.8 },
  t5_name: { color: '#FFF', fontWeight: '200', textAlign: 'center' },
  t5_line: { width: 2, height: 40, backgroundColor: '#E0A96D', marginVertical: 20 },
  t5_date: { color: '#E0A96D', letterSpacing: 2 },
  t5_venue: { color: '#FFF', opacity: 0.6, marginTop: 10, textAlign: 'center' },

  // 6
  t6_container: { backgroundColor: '#F79256', padding: 20, justifyContent: 'space-between' },
  t6_header: { color: '#FFF', fontWeight: 'bold', letterSpacing: 2 },
  t6_box: { backgroundColor: '#FFF', padding: 20, marginVertical: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, alignItems: 'center' },
  t6_name: { color: '#F79256', fontWeight: '900' },
  t6_and: { color: '#F79256', marginVertical: 10 },
  t6_date: { color: '#FFF', fontWeight: 'bold' },
  t6_venue: { color: '#FFF', opacity: 0.9 },

  // 7
  t7_bg: { flex: 1, justifyContent: 'center', padding: 20 },
  t7_glass: { backgroundColor: 'rgba(255,255,255,0.7)', padding: 30, borderRadius: 16, alignItems: 'center' },
  t7_name: { color: '#333', fontFamily: 'serif' },
  t7_and: { color: '#666', fontStyle: 'italic', marginVertical: 5 },
  t7_date: { color: '#333', fontWeight: 'bold', marginTop: 20 },

  // 8
  t8_container: { backgroundColor: '#FFF', padding: 30, justifyContent: 'flex-end' },
  t8_stripe: { position: 'absolute', left: 30, top: 0, bottom: 0, width: 20, backgroundColor: '#000' },
  t8_name: { color: '#000', fontWeight: 'bold', marginLeft: 40 },
  t8_date: { color: '#666', marginLeft: 40, marginTop: 30, fontWeight: 'bold' },
  t8_venue: { color: '#999', marginLeft: 40, marginTop: 5 },

  // 9
  t9_container: { backgroundColor: '#E25822', padding: 15 },
  t9_arch: { flex: 1, backgroundColor: '#FFF', borderTopLeftRadius: 100, borderTopRightRadius: 100, padding: 20, alignItems: 'center', justifyContent: 'center' },
  t9_name: { color: '#E25822', fontWeight: 'bold' },
  t9_and: { color: '#E25822', marginVertical: 10 },
  t9_line: { width: 30, height: 2, backgroundColor: '#E25822', marginVertical: 20 },
  t9_date: { color: '#333', fontWeight: 'bold' },
  t9_venue: { color: '#666', textAlign: 'center', marginTop: 5 },

  // 10
  t10_bg: { flex: 1, justifyContent: 'flex-end' },
  t10_overlay: { padding: 30, backgroundColor: 'rgba(0,0,0,0.4)' },
  t10_name: { color: '#FFF', fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
  t10_date: { color: '#FFF', marginTop: 10, fontWeight: 'bold' },

  // 11
  t11_container: { backgroundColor: '#FAFAFA', padding: 20, justifyContent: 'center' },
  t11_border: { flex: 1, borderWidth: 1, borderColor: '#B8860B', padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  t11_name: { color: '#B8860B', fontFamily: 'serif', textAlign: 'center' },
  t11_and: { color: '#333', marginVertical: 10, letterSpacing: 2 },
  t11_divider: { width: 40, height: 1, backgroundColor: '#B8860B', marginVertical: 20 },
  t11_date: { color: '#333', fontWeight: 'bold' },
  t11_venue: { color: '#666', marginTop: 10, textAlign: 'center' },

  // 12
  t12_container: { backgroundColor: '#FFEFEF', padding: 30, alignItems: 'center', justifyContent: 'center' },
  t12_header: { color: '#905E5E', fontStyle: 'italic', marginBottom: 20 },
  t12_name: { color: '#905E5E', fontFamily: 'serif' },
  t12_and: { color: '#B58787', fontStyle: 'italic', marginVertical: 10 },
  t12_date: { color: '#5C4A4D', marginTop: 30, fontWeight: 'bold' },
  t12_venue: { color: '#5C4A4D', marginTop: 5 },

  // 13
  t13_container: { backgroundColor: '#1C1C1C', padding: 20, alignItems: 'center', justifyContent: 'center' },
  t13_circle: { width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: '#D4AF37', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  t13_name: { color: '#D4AF37', fontFamily: 'serif' },
  t13_and: { color: '#FFF', fontSize: 10, letterSpacing: 3, marginVertical: 10 },
  t13_date: { color: '#FFF', letterSpacing: 2 },
  t13_venue: { color: '#999', marginTop: 10 },

  // 14
  t14_container: { backgroundColor: '#F0F0F0', padding: 30, justifyContent: 'center' },
  t14_diamond: { alignSelf: 'center', padding: 40, backgroundColor: '#FFF', transform: [{ rotate: '45deg' }], alignItems: 'center', justifyContent: 'center', marginBottom: 50 },
  t14_name: { color: '#333', fontWeight: '900', transform: [{ rotate: '-45deg' }], marginVertical: 5 },
  t14_bottom: { alignItems: 'center' },
  t14_date: { color: '#333', fontWeight: 'bold' },
  t14_venue: { color: '#666', marginTop: 5 },

});

export const TEMPLATES = [
  { id: 't1', name: 'The Classic', component: TemplateClassic },
  { id: 't2', name: 'Modern Minimalist', component: TemplateModern },
  { id: 't3', name: 'Royal Heritage', component: TemplateRoyal },
  { id: 't4', name: 'Floral Pastel', component: TemplatePastel },
  { id: 't5', name: 'Night Sky', component: TemplateNight },
  { id: 't6', name: 'Vibrant Celebration', component: TemplateVibrant },
  { id: 't7', name: 'Elegant Glass', component: TemplateGlass },
  { id: 't8', name: 'Monochrome Chic', component: TemplateMonochrome },
  { id: 't9', name: 'Cultural Traditional', component: TemplateTraditional },
  { id: 't10', name: 'Contemporary Photo', component: TemplatePhoto },

  { id: 't11', name: 'Minimalist Gold', component: TemplateGold },
  { id: 't12', name: 'Watercolor Blush', component: TemplateWatercolor },
  { id: 't13', name: 'Dark Elegance', component: TemplateDarkElegance },
  { id: 't14', name: 'Modern Geometric', component: TemplateGeometric },
];
