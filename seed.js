import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import Papa from 'papaparse'

const supabase = createClient(
  'https://peauypwudiuzwdekoetn.supabase.co',
  'sb_publishable_d742Oj9Gybula5RO4EWuHg_Vk4elglL'
)

const csv = readFileSync('./data/sample_customer_sales.csv', 'utf8')
const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true })

const rows = data
  .filter(r => r['Customer Name']?.trim())
  .map(r => ({
    customer_name:     r['Customer Name']?.trim(),
    product_category:  r['Product Category']?.trim(),
    item_description:  r['Item Description']?.trim(),
    quantity:          Number(r['Quantity']) || 0,
    unit_price:        Number(r['Unit Price']) || 0,
    total_sale:        Number(r['Total Sale']) || 0,
    cogs:              Number(r['COGS']) || 0,
    profit:            Number(r['Profit']) || 0,
    profit_margin_pct: parseFloat(r['Profit Margin %']) || 0,
    sale_date:         r['Date']?.trim(),
    region:            r['Region']?.trim(),
  }))

console.log(`Inserting ${rows.length} rows…`)
const { error } = await supabase.from('sales').insert(rows)

if (error) {
  console.error('Error inserting data:', error.message)
} else {
  console.log('Done! All rows inserted successfully.')
}
