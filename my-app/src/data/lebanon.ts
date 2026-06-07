/**
 * Lebanon governorate → areas mapping used by the signup forms' location
 * selectors. Single source of truth (previously duplicated in both signup pages).
 */
export const lebanonAreas: Record<string, string[]> = {
  'Beirut': ['Hamra', 'Verdun', 'Ashrafieh', 'Gemmayzeh', 'Mar Mikhael', 'Ras Beirut', 'Achrafieh', 'Badaro', 'Sin el Fil', 'Bourj Hammoud'],
  'Mount Lebanon': ['Jounieh', 'Kaslik', 'Antelias', 'Dbayeh', 'Zalka', 'Baabda', 'Aley', 'Bhamdoun', 'Broummana', 'Metn', 'Hazmieh'],
  'North Lebanon': ['Tripoli', 'Zgharta', 'Koura', 'Bcharre', 'Batroun', 'Byblos', 'Jbeil', 'Amioun', 'Miniyeh'],
  'South Lebanon': ['Sidon', 'Tyre', 'Nabatieh', 'Marjayoun', 'Hasbaya', 'Jezzine', 'Saida', 'Sour', 'Bint Jbeil', 'Khiam'],
  'Bekaa': ['Zahle', 'Baalbek', 'Hermel', 'Rashaya', 'West Bekaa', 'Marjayoun', 'Chtaura', 'Anjar', 'Qabb Elias', 'Rayak'],
  'Nabatieh': ['Nabatieh', 'Marjayoun', 'Hasbaya', 'Bint Jbeil', 'Khiam', 'Tebnine', 'Ain Ebel', 'Deir Mimas', 'Kfar Kila', 'Rmeish'],
};
