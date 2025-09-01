import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Expense, Listing, Owner, Inventory } from '../schema/schema.js';
import type PDFKit from 'pdfkit';

// Ensure reports directory exists in /tmp
const reportDir = path.join('/tmp', 'temp-reports');
if (!fs.existsSync(reportDir)) {
  try {
    fs.mkdirSync(reportDir, { recursive: true });
    console.log(`[PDF Service] Created report directory: ${reportDir}`);
  } catch (err: any) {
    console.error(`[PDF Service] ERROR: Failed to create report directory ${reportDir}:`, err.message);
    // If we can't create the primary temp dir, subsequent writes will fail.
    // Depending on desired behavior, could throw here or try a fallback within /tmp.
    // For now, errors will be caught by individual writeStream attempts.
  }
}

interface ExpenseReportOptions {
  owner: Owner;
  listings: Listing[];
  expenses: Expense[];
  inventoryItems: Record<number, Inventory>;
  month: number;
  year: number;
}

/**
 * Draws a table with headers and rows
 */
function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[], 
  rows: string[][], 
  x: number, 
  y: number, 
  columnWidths: number[],
  options: { 
    headerBgColor?: string,
    cellPadding?: number,
    zebra?: boolean,
    fontSize?: number,
    headerFontSize?: number,
    textColor?: string,
    headerTextColor?: string
  } = {}
): number {
  // Default options
  const {
    headerBgColor = '#4c6ef5',
    cellPadding = 5,
    zebra = true,
    fontSize = 10,
    headerFontSize = 10,
    textColor = '#333',
    headerTextColor = '#ffffff'
  } = options;

  const rowHeight = fontSize * 2;
  const headerHeight = headerFontSize * 2;
  
  // Draw headers
  doc.fillColor(headerBgColor);
  doc.rect(x, y, columnWidths.reduce((a, b) => a + b, 0), headerHeight).fill();
  
  // Header text
  doc.font('Helvetica-Bold').fontSize(headerFontSize).fillColor(headerTextColor);
  
  let xPos = x;
  headers.forEach((header, i) => {
    doc.text(header, xPos + cellPadding, y + cellPadding, {
      width: columnWidths[i] - (cellPadding * 2),
      align: 'left'
    });
    xPos += columnWidths[i];
  });
  
  // Draw rows
  let currentY = y + headerHeight;
  
  doc.font('Helvetica').fontSize(fontSize).fillColor(textColor);
  
  rows.forEach((row, rowIndex) => {
    // Zebra striping
    if (zebra && rowIndex % 2 === 0) {
      doc.fillColor('#f8f9fa');
      doc.rect(x, currentY, columnWidths.reduce((a, b) => a + b, 0), rowHeight).fill();
      doc.fillColor(textColor);
    }
    
    // Draw row data
    xPos = x;
    row.forEach((cell, cellIndex) => {
      // Right align numbers in the last few columns
      const isNumber = /^\$?\d+(\.\d+)?%?$/.test(cell);
      const align = (isNumber && cellIndex >= row.length - 3) ? 'right' : 'left';
      
      doc.text(cell, xPos + cellPadding, currentY + cellPadding, {
        width: columnWidths[cellIndex] - (cellPadding * 2),
        align
      });
      xPos += columnWidths[cellIndex];
    });
    
    // Draw horizontal line
    doc.strokeColor('#e9ecef');
    doc.lineWidth(0.5);
    doc.moveTo(x, currentY).lineTo(x + columnWidths.reduce((a, b) => a + b, 0), currentY).stroke();
    
    currentY += rowHeight;
  });
  
  // Draw final horizontal line
  doc.strokeColor('#e9ecef');
  doc.lineWidth(0.5);
  doc.moveTo(x, currentY).lineTo(x + columnWidths.reduce((a, b) => a + b, 0), currentY).stroke();
  
  // Draw vertical lines
  xPos = x;
  doc.strokeColor('#e9ecef');
  
  for (let i = 0; i <= columnWidths.length; i++) {
    doc.moveTo(xPos, y).lineTo(xPos, currentY).stroke();
    if (i < columnWidths.length) {
      xPos += columnWidths[i];
    }
  }
  
  return currentY; // Return the Y position after the table
}

/**
 * Draws a bar chart
 */
function drawBarChart(
  doc: PDFKit.PDFDocument,
  data: { label: string, value: number }[],
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    title?: string,
    barColor?: string,
    barWidth?: number,
    labelFontSize?: number,
    valueFontSize?: number,
    showValues?: boolean,
    showGrid?: boolean,
    maxBars?: number
  } = {}
): number {
  // Default options
  const {
    title = '',
    barColor = '#4c6ef5',
    barWidth = 30,
    labelFontSize = 8,
    valueFontSize = 8,
    showValues = true,
    showGrid = true,
    maxBars = 7
  } = options;
  
  // Draw title if provided
  let startY = y;
  if (title) {
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#333');
    doc.text(title, x, startY, { width, align: 'center' });
    startY += 20;
  }
  
  // Sort data by value (descending)
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  
  // Limit number of bars to display
  const displayData = sortedData.slice(0, maxBars);
  
  // Calculate chart dimensions
  const chartMargin = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - chartMargin.left - chartMargin.right;
  const chartHeight = height - chartMargin.top - chartMargin.bottom - (title ? 20 : 0);
  
  const chartX = x + chartMargin.left;
  const chartY = startY + chartMargin.top;
  
  // Find maximum value for scaling
  const maxValue = Math.max(...displayData.map(d => d.value), 0);
  
  // Calculate bar spacing
  const barSpacing = Math.min(chartWidth / displayData.length, barWidth * 2);
  
  // Draw Y-axis grid lines
  if (showGrid) {
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const gridY = chartY + chartHeight - (i * (chartHeight / gridLines));
      const gridValue = (i * (maxValue / gridLines));
      
      // Draw grid line
      doc.strokeColor('#e9ecef');
      doc.moveTo(chartX, gridY).lineTo(chartX + chartWidth, gridY).stroke();
      
      // Draw grid label
      doc.font('Helvetica').fontSize(8).fillColor('#666');
      doc.text(
        `$${gridValue.toFixed(0)}`,
        chartX - 30,
        gridY - 4,
        { width: 25, align: 'right' }
      );
    }
  }
  
  // Draw X and Y axes
  doc.strokeColor('#333');
  doc.lineWidth(1);
  doc.moveTo(chartX, chartY).lineTo(chartX, chartY + chartHeight).stroke(); // Y-axis
  doc.moveTo(chartX, chartY + chartHeight).lineTo(chartX + chartWidth, chartY + chartHeight).stroke(); // X-axis
  
  // Draw bars
  displayData.forEach((d, i) => {
    const barHeight = (d.value / maxValue) * chartHeight;
    const barX = chartX + (i * barSpacing) + (barSpacing - barWidth) / 2;
    const barY = chartY + chartHeight - barHeight;
    
    // Draw bar
    doc.fillColor(barColor);
    doc.rect(barX, barY, barWidth, barHeight).fill();
    
    // Draw value on top of bar if requested
    if (showValues) {
      doc.font('Helvetica-Bold').fontSize(valueFontSize).fillColor('#333');
      doc.text(
        `$${d.value.toFixed(0)}`,
        barX,
        barY - 15,
        { width: barWidth, align: 'center' }
      );
    }
    
    // Draw label
    doc.font('Helvetica').fontSize(labelFontSize).fillColor('#333');
    
    // Truncate label if too long
    let label = d.label;
    if (label.length > 10) {
      label = label.substring(0, 8) + '...';
    }
    
    doc.text(
      label,
      barX - barWidth/2,
      chartY + chartHeight + 5,
      { width: barWidth * 2, align: 'center' }
    );
  });
  
  return startY + height; // Return the ending Y position
}

/**
 * Draws a pie chart
 */
function drawPieChart(
  doc: PDFKit.PDFDocument,
  data: { label: string, value: number }[],
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    title?: string,
    colors?: string[],
    legendPosition?: 'right' | 'below',
    showPercentages?: boolean
  } = {}
): number {
  // Default options
  const {
    title = '',
    colors = ['#4c6ef5', '#339af0', '#51cf66', '#fcc419', '#ff922b', '#f06595', '#cc5de8'],
    legendPosition = 'below',
    showPercentages = true
  } = options;
  
  // Draw title if provided
  let startY = y;
  if (title) {
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#333');
    doc.text(title, x, startY, { width, align: 'center' });
    startY += 20;
  }
  
  // Filter out zero values and calculate total
  const filteredData = data.filter(d => d.value > 0);
  const total = filteredData.reduce((sum, d) => sum + d.value, 0);
  
  // Calculate chart dimensions
  let pieWidth, pieHeight, pieX, pieY;
  let legendX, legendY, legendWidth;
  
  if (legendPosition === 'right') {
    pieWidth = width * 0.6;
    pieHeight = height - (title ? 20 : 0);
    pieX = x + pieWidth / 2;
    pieY = startY + pieHeight / 2;
    
    legendX = x + pieWidth + 20;
    legendY = startY;
    legendWidth = width - pieWidth - 20;
  } else { // 'below'
    pieWidth = width;
    pieHeight = height * 0.7 - (title ? 20 : 0);
    pieX = x + pieWidth / 2;
    pieY = startY + pieHeight / 2;
    
    legendX = x;
    legendY = startY + pieHeight + 10;
    legendWidth = width;
  }
  
  const radius = Math.min(pieWidth, pieHeight) / 2 - 10;
  
  // Draw pie slices
  let currentAngle = 0;
  
  filteredData.forEach((d, i) => {
    const percentage = total > 0 ? (d.value / total) * 100 : 0;
    const angle = (percentage / 100) * Math.PI * 2;
    const color = colors[i % colors.length];
    
    // Draw slice
    doc.fillColor(color);
    doc.moveTo(pieX, pieY);
    doc.path(`M ${pieX} ${pieY} L ${pieX + radius * Math.cos(currentAngle)} ${pieY + radius * Math.sin(currentAngle)} A ${radius} ${radius} 0 ${angle > Math.PI ? 1 : 0} 1 ${pieX + radius * Math.cos(currentAngle + angle)} ${pieY + radius * Math.sin(currentAngle + angle)} Z`);
    doc.fill();
    
    currentAngle += angle;
  });
  
  // Draw legend
  doc.font('Helvetica').fontSize(9).fillColor('#333');
  
  let legendEntryHeight = 15;
  let legendCurrentY = legendY;
  let legendCurrentX = legendX;
  let legendColumnWidth = legendWidth;
  let entriesPerColumn = filteredData.length;
  
  // If we have too many entries and legend is below, use multiple columns
  if (legendPosition === 'below' && filteredData.length > 5) {
    const numColumns = Math.ceil(filteredData.length / 5);
    legendColumnWidth = legendWidth / numColumns;
    entriesPerColumn = Math.ceil(filteredData.length / numColumns);
  }
  
  filteredData.forEach((d, i) => {
    const percentage = total > 0 ? (d.value / total) * 100 : 0;
    const color = colors[i % colors.length];
    
    // Start a new column if needed
    if (legendPosition === 'below' && i > 0 && i % entriesPerColumn === 0) {
      legendCurrentX += legendColumnWidth;
      legendCurrentY = legendY;
    }
    
    // Draw color box
    doc.fillColor(color);
    doc.rect(legendCurrentX, legendCurrentY, 10, 10).fill();
    
    // Draw label
    doc.fillColor('#333');
    let label = d.label;
    if (label.length > 20) {
      label = label.substring(0, 17) + '...';
    }
    
    const labelText = showPercentages
      ? `${label} (${percentage.toFixed(1)}%, $${d.value.toFixed(0)})`
      : `${label} ($${d.value.toFixed(0)})`;
    
    doc.text(
      labelText,
      legendCurrentX + 15,
      legendCurrentY + 1,
      { width: legendColumnWidth - 20 }
    );
    
    legendCurrentY += legendEntryHeight;
  });
  
  // Return the total height used
  return Math.max(
    startY + pieHeight + (legendPosition === 'below' ? (Math.ceil(filteredData.length / entriesPerColumn) * legendEntryHeight) + 20 : 0),
    legendY + filteredData.length * legendEntryHeight
  );
}

/**
 * Generate a monthly expense report PDF for an owner
 */
export async function generateMonthlyExpenseReport(options: ExpenseReportOptions): Promise<string> {
  const { owner, listings, expenses, inventoryItems, month, year } = options;
  
  // Create a unique filename
  const uniqueId = `report_${owner.id}_${month}_${year}_${Date.now()}`;
  const filename = `${uniqueId}.pdf`;
  const filePath = path.join(reportDir, filename);
  
  console.log(`[PDF Generation] Starting for owner: ${owner.name}, Month: ${month}, Year: ${year}`);
  console.log(`[PDF Generation] Target filePath: ${filePath}`);

  // Create PDF document with A4 size
  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
  const stream = fs.createWriteStream(filePath);
  
  // Define standard fonts
  const FONT_REGULAR = 'Helvetica';
  const FONT_BOLD = 'Helvetica-Bold';
  const FONT_OBLIQUE = 'Helvetica-Oblique';
  const COLOR_PRIMARY = '#4c6ef5'; // Blue
  const COLOR_SECONDARY = '#f8f9fa'; // Light Gray
  const COLOR_TEXT_DARK = '#333333';
  const COLOR_TEXT_LIGHT = '#ffffff';
  const COLOR_TEXT_MUTED = '#555555';
  const COLOR_BORDER = '#e9ecef';

  return new Promise((resolve, reject) => {
    // Pipe the PDF to a write stream
    doc.pipe(stream);
    
    // Format month name
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[month - 1];
    
    // Create a styled header
    doc.rect(0, 0, doc.page.width, 100).fill(COLOR_SECONDARY);
    doc.rect(0, 100, doc.page.width, 10).fill(COLOR_PRIMARY);
    
    // Header text
    doc.fontSize(24).font(FONT_BOLD).fillColor(COLOR_TEXT_DARK)
       .text('Monthly Expense Report', 50, 40, { align: 'center' });
    doc.fontSize(16).font(FONT_REGULAR).fillColor(COLOR_TEXT_MUTED)
       .text(`${monthName} ${year}`, 50, 70, { align: 'center' });
    
    // Add property logo or icon if available
    
    // SECTION: Owner Information Card
    let yPos = 130;
    
    doc.fontSize(18).font(FONT_BOLD).fillColor(COLOR_TEXT_DARK)
       .text('Owner Information', 50, yPos);
    yPos += 30;
    
    // Owner info card
    doc.roundedRect(50, yPos, doc.page.width - 100, 90, 5).fill(COLOR_SECONDARY);
    doc.fillColor(COLOR_TEXT_DARK); // Reset fill color for text inside card
    
    // Owner info content
    doc.fontSize(12).font(FONT_BOLD)
       .text('Name:', 70, yPos + 15);
    doc.font(FONT_REGULAR)
       .text(owner.name, 150, yPos + 15);
    
    doc.font(FONT_BOLD)
       .text('Email:', 70, yPos + 40);
    doc.font(FONT_REGULAR)
       .text(owner.email, 150, yPos + 40);
    
    doc.font(FONT_BOLD)
       .text('Phone:', 70, yPos + 65);
    doc.font(FONT_REGULAR)
       .text(owner.phone || 'N/A', 150, yPos + 65);
    
    yPos += 110;
    
    // SECTION: Properties Table
    doc.fontSize(18).font(FONT_BOLD).fillColor(COLOR_TEXT_DARK)
       .text('Properties', 50, yPos);
    yPos += 30;
    
    if (listings.length === 0) {
      doc.fontSize(12).font(FONT_OBLIQUE).fillColor(COLOR_TEXT_MUTED)
         .text('No properties found.', 50, yPos);
      yPos += 30; // Added some space after this message
    } else {
      // Format property data for table
      const propertyHeaders = ['Property Name', 'Address', 'Type'];
      const propertyRows = listings.map(listing => [
        listing.name || 'Unnamed Property',
        listing.address || 'No address',
        listing.propertyType || 'N/A'
      ]);
      
      // Draw properties table - adjusted for 3 columns
      const propertyColumnWidths = [200, 220, 80];
      yPos = drawTable(doc, propertyHeaders, propertyRows, 50, yPos, propertyColumnWidths) + 20;
    }
    
    // SECTION: Financial Summary
    // Check if we need a new page
    if (yPos > doc.page.height - 250) {
      doc.addPage();
      yPos = 50;
    }
    
    doc.fontSize(18).font(FONT_BOLD).fillColor(COLOR_TEXT_DARK)
       .text('Financial Summary', 50, yPos);
    yPos += 30;
    
    // Calculate summary totals - Only showing total expenses (not markup)
    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.billedAmount), 0);
    const totalProperties = listings.length;
    
    // Summary cards with styled boxes
    const cardWidth = (doc.page.width - 100 - 10) / 2; // Added spacing between cards
    
    // Total Expenses card
    doc.roundedRect(50, yPos, cardWidth, 80, 5).fill('#f1f8ff'); // Light blue variant
    doc.fontSize(14).font(FONT_BOLD).fillColor('#3182ce')
       .text('Total Expenses', 50, yPos + 15, { width: cardWidth, align: 'center' });
    doc.fontSize(20).font(FONT_BOLD).fillColor(COLOR_TEXT_DARK)
       .text(`$${totalExpenses.toFixed(2)}`, 50, yPos + 45, { width: cardWidth, align: 'center' });
    
    // Properties count card
    doc.roundedRect(50 + cardWidth + 10, yPos, cardWidth, 80, 5).fill('#f0fff4'); // Light green variant
    doc.fontSize(14).font(FONT_BOLD).fillColor('#38a169')
       .text('Properties', 50 + cardWidth + 10, yPos + 15, { width: cardWidth, align: 'center' });
    doc.fontSize(20).font(FONT_BOLD).fillColor(COLOR_TEXT_DARK)
       .text(totalProperties.toString(), 50 + cardWidth + 10, yPos + 45, { width: cardWidth, align: 'center' });
    
    yPos += 100;
    
    // SECTION: Detailed Expenses by Property
    // doc.addPage();
    yPos += 50;
    
    doc.fontSize(18).font(FONT_BOLD).fillColor(COLOR_TEXT_DARK)
       .text('Detailed Expenses by Property', 50, yPos);
    yPos += 30;
    
    if (expenses.length === 0) {
      doc.fontSize(12).font(FONT_OBLIQUE).fillColor(COLOR_TEXT_MUTED)
         .text('No expenses found for this period.', 50, yPos);
      yPos += 30;
    } else {
      // Group expenses by property
      const expensesByProperty: Record<number, Expense[]> = {};
      
      expenses.forEach(expense => {
        if (!expensesByProperty[expense.listingId]) {
          expensesByProperty[expense.listingId] = [];
        }
        expensesByProperty[expense.listingId].push(expense);
      });
      
      // For each property
      Object.entries(expensesByProperty).forEach(([listingIdStr, propertyExpenses], index) => {
        const listingId = Number(listingIdStr);
        const listing = listings.find(l => l.id === listingId);
        
        if (!listing) return;
        
        // Add space between properties
        if (index > 0) {
          yPos += 20;
        }
        
        // Check if we need a new page
        if (yPos > doc.page.height - 200) {
          doc.addPage();
          yPos = 50;
        }
        
        // Property header
        doc.roundedRect(50, yPos, doc.page.width - 100, 30, 5).fill(COLOR_BORDER); // Use defined border color
        doc.fontSize(14).font(FONT_BOLD).fillColor(COLOR_TEXT_DARK)
           .text(listing.name, 60, yPos + 8);
        yPos += 40;
        
        // Property details
        doc.fontSize(10).font(FONT_REGULAR).fillColor(COLOR_TEXT_MUTED)
           .text(`Address: ${listing.address || 'N/A'}`, 50, yPos)
           .text(`Property Type: ${listing.propertyType || 'N/A'}`, 50, yPos + 15);
        
        // Property financials - Only showing total cost (expenses)
        const propertyExpenses_total = propertyExpenses.reduce((sum, exp) => sum + Number(exp.billedAmount || 0), 0);
        
        doc.fontSize(10).font(FONT_BOLD).fillColor('#333')
           .text(`Total Expenses: $${propertyExpenses_total.toFixed(2)}`, 350, yPos);
        
        yPos += 50;
        
        // Create expense table - Remove markup related columns
        const expenseHeaders = ['Date', 'Description', 'Item', 'Qty','Unit Cost', 'Total Cost'];
        const expenseRows = propertyExpenses.map(expense => {
          const expenseDate = expense.date 
            ? new Date(expense.date).toLocaleDateString('en-US', { 
                year: '2-digit', // Using 2-digit year for brevity
                month: 'short', 
                day: 'numeric' 
              }) 
            : 'N/A';
          
          const inventoryItem = expense.inventoryId ? inventoryItems[expense.inventoryId] : null;
          const itemName = inventoryItem ? inventoryItem.name : 'N/A';
          
          const cost = parseFloat(expense.billedAmount);
          const unitcost = parseFloat(expense.billedAmount) / Number(expense.quantityUsed );
          
          return [
            expenseDate,
            expense.notes || 'No description',
            itemName,
            expense.quantityUsed?.toString() || 'N/A',
            `$${unitcost.toFixed(2)}`,
            `$${cost.toFixed(2)}`
          ];
        });
        
        // Check if we need a new page for the table
        if (yPos > doc.page.height - 150) {
          doc.addPage();
          yPos = 50;
          
          // Repeat property name on new page
          doc.fontSize(14).font(FONT_BOLD).fillColor(COLOR_TEXT_DARK)
             .text(`${listing.name} (continued)`, 50, yPos);
          yPos += 20;
        }
        
        // Draw table - Adjusted column widths for 5 columns instead of 7
        const expenseColumnWidths = [75, 150, 90, 40, 70, 70];
        yPos = drawTable(doc, expenseHeaders, expenseRows, 50, yPos, expenseColumnWidths) + 30;
      });
    }
    
    // Add footer to every page
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      
      // Footer separator line
      doc.strokeColor(COLOR_BORDER).lineWidth(1)
         .moveTo(50, doc.page.height - 50)
         .lineTo(doc.page.width - 50, doc.page.height - 50)
         .stroke();
      
      // // Footer text
      // doc.fontSize(8).font(FONT_REGULAR).fillColor('#aaa') // Kept original color for footer
      //    .text(
      //      `Report generated on ${new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'})} at ${new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}`,
      //      50, 
      //      doc.page.height - 30,
      //    );
      
      // // Page numbers
      // doc.fontSize(8).font(FONT_REGULAR).fillColor('#aaa')
      //    .text(
      //      `Page ${i + 1} of ${range.count}`,
      //      doc.page.width - 150,
      //      doc.page.height - 30,
      //    );
    }
    
    // Finalize PDF
    doc.end();
    
    stream.on('finish', () => {
      console.log(`[PDF Generation] Successfully finished writing PDF to: ${filePath}`);
      resolve(filePath);
    });
    
    stream.on('error', (error) => {
      console.error(`[PDF Generation] CRITICAL: Stream error during PDF generation for ${filePath}:`, error.message, error.stack);
      reject(error);
    });
  });
}
