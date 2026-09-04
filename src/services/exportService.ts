import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

export const ExportService = {
  /**
   * Generates a CSV file from an array of objects and opens the share sheet.
   * Ensures UTF-8 BOM is added so Excel and other tools read characters (like Hindi) correctly.
   */
  async exportToCSV(data: any[], filename: string): Promise<boolean> {
    if (!data || data.length === 0) {
      console.warn("No data to export");
      return false;
    }

    try {
      // Extract headers from the first object
      const headers = Object.keys(data[0]);
      
      // Map data to CSV rows
      const csvRows = data.map(row => {
        return headers.map(fieldName => {
          let value = row[fieldName];
          
          if (value === null || value === undefined) {
            value = '';
          } else {
            value = String(value);
          }
          
          // Escape quotes and wrap in quotes if there are commas, newlines, or quotes
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          
          return value;
        }).join(',');
      });

      // Combine headers and rows
      const csvString = [headers.join(','), ...csvRows].join('\n');
      
      // Prepend UTF-8 BOM for proper Excel rendering of special characters
      const bom = '\uFEFF';
      const fileContent = bom + csvString;

      // Ensure filename ends with .csv
      const safeFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${safeFilename}`;

      // Write file
      await FileSystem.writeAsStringAsync(fileUri, fileContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      // Share file
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Share ${filename}`,
        });
        return true;
      } else {
        console.warn("Sharing is not available on this platform");
        return false;
      }
    } catch (error) {
      console.error("Error exporting to CSV:", error instanceof Error ? error.message : String(error));
      return false;
    }
  },

  /**
   * Generates a PDF file from an HTML string and opens the share sheet.
   */
  async exportToPDF(htmlContent: string, filename: string): Promise<boolean> {
    try {
      // Generate PDF from HTML
      const { uri } = await Print.printToFileAsync({ 
        html: htmlContent,
        base64: false 
      });

      // Ensure filename ends with .pdf
      const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
      
      // Move to a properly named file in cache directory so the share sheet shows the right name
      const newUri = `${FileSystem.cacheDirectory}${safeFilename}`;
      await FileSystem.moveAsync({
        from: uri,
        to: newUri
      });

      // Share file
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${filename}`,
        });
        return true;
      } else {
        console.warn("Sharing is not available on this platform");
        return false;
      }
    } catch (error) {
      console.error("Error exporting to PDF:", error instanceof Error ? error.message : String(error));
      return false;
    }
  }
};
