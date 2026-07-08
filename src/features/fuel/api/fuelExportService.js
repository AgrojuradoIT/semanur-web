import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { fetchFuelRecords } from './fuelService';
import { formatDateTimeCO } from '../../../shared/utils/formatters';

function destinationLabel(item) {
  if (['vehiculo', 'maquinaria', 'equipo_menor'].includes(item.tipo_destino)) {
    return item.vehiculo?.placa || item.vehiculo?.marca || 'Sin Vehículo';
  }
  return item.tercero_nombre || '-';
}

function destinationTypeLabel(type) {
  const map = {
    vehiculo: 'Vehículo',
    maquinaria: 'Maquinaria',
    equipo_menor: 'Eq. Menor',
    empleado: 'Empleado',
    tercero: 'Tercero',
  };
  return map[type] || 'Otro';
}

export async function exportFuelRecordsToExcel({ fechaDesde, fechaHasta, columns }) {
  // 1. Fetch data
  const params = { per_page: 9999 };
  if (fechaDesde) params.fecha_desde = fechaDesde;
  if (fechaHasta) params.fecha_hasta = fechaHasta;
  
  const response = await fetchFuelRecords(params);
  const records = response.data || [];

  // 2. Create Workbook and Worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Registros de Combustible');

  // 3. Setup Columns
  const columnDefs = {
    fecha: { header: 'FECHA', key: 'fecha', width: 20 },
    tipo_combustible: { header: 'TIPO COMBUSTIBLE', key: 'tipo_combustible', width: 20 },
    tipo_destino: { header: 'TIPO DESTINO', key: 'tipo_destino', width: 20 },
    destino: { header: 'DESTINO (PLACA/NOMBRE)', key: 'destino', width: 30 },
    galones: { header: 'GALONES', key: 'galones', width: 15 },
    horometro: { header: 'HORÓMETRO', key: 'horometro', width: 15 },
    kilometraje: { header: 'KILOMETRAJE', key: 'kilometraje', width: 15 },
    labor: { header: 'LABOR / DESTINO', key: 'labor', width: 30 },
    responsable: { header: 'CONDUCTOR / RESPONSABLE', key: 'responsable', width: 30 },
    registrado_por: { header: 'REGISTRADO POR', key: 'registrado_por', width: 25 },
    notas: { header: 'NOTAS', key: 'notas', width: 40 },
  };

  const selectedCols = columns.map(colKey => columnDefs[colKey]).filter(Boolean);

  // 4. Add Logo & Header Information
  const startRowIndex = 6;
  
  try {
    const imgRes = await fetch('/logo.png');
    const blob = await imgRes.blob();
    const arrayBuffer = await blob.arrayBuffer();
    
    const logoId = workbook.addImage({
      buffer: arrayBuffer,
      extension: 'png',
    });
    
    worksheet.addImage(logoId, {
      tl: { col: 0, row: 0 },
      ext: { width: 150, height: 60 }
    });
  } catch (e) {
    console.warn("Could not load logo for Excel export", e);
  }

  // Add titles
  worksheet.mergeCells('B1:E1');
  const titleCell = worksheet.getCell('B1');
  titleCell.value = 'SEMANUR HUB - REPORTE DE COMBUSTIBLE';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF000000' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  worksheet.mergeCells('B2:E2');
  const dateRangeCell = worksheet.getCell('B2');
  dateRangeCell.value = `Periodo: ${fechaDesde ? fechaDesde : 'Inicio'} a ${fechaHasta ? fechaHasta : 'Hoy'}`;
  dateRangeCell.font = { name: 'Arial', size: 12, italic: true };
  
  worksheet.mergeCells('B3:E3');
  const generatedCell = worksheet.getCell('B3');
  generatedCell.value = `Generado el: ${formatDateTimeCO(new Date())}`;
  generatedCell.font = { name: 'Arial', size: 10, color: { argb: 'FF666666' } };

  // 5. Add Table Headers
  const headerRow = worksheet.getRow(startRowIndex);
  selectedCols.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: {style:'thin'},
      left: {style:'thin'},
      bottom: {style:'thin'},
      right: {style:'thin'}
    };
    
    worksheet.getColumn(index + 1).width = col.width;
  });

  // 6. Add Data Rows
  records.forEach((item, rowIndex) => {
    const row = worksheet.getRow(startRowIndex + 1 + rowIndex);
    
    selectedCols.forEach((col, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      
      let value = '';
      switch (col.key) {
        case 'fecha':
          value = formatDateTimeCO(item.fecha || item.created_at);
          break;
        case 'tipo_combustible':
          value = (item.tipo_combustible || 'gasolina').toUpperCase();
          break;
        case 'tipo_destino':
          value = destinationTypeLabel(item.tipo_destino);
          break;
        case 'destino':
          value = destinationLabel(item);
          break;
        case 'galones':
          value = Number(item.cantidad_galones) || 0;
          break;
        case 'horometro':
          value = item.horometro_actual ?? '-';
          break;
        case 'kilometraje':
          value = item.kilometraje_actual ?? '-';
          break;
        case 'labor':
          value = item.labor || '-';
          break;
        case 'responsable':
          value = item.empleado?.name || item.empleado?.nombre || item.tercero_nombre || '-';
          break;
        case 'registrado_por':
          value = item.usuario?.name || item.registrado_por?.name || '-';
          break;
        case 'notas':
          value = item.notas || '-';
          break;
      }
      
      cell.value = value;
      cell.border = {
        top: {style:'thin', color: {argb:'FFEEEEEE'}},
        left: {style:'thin', color: {argb:'FFEEEEEE'}},
        bottom: {style:'thin', color: {argb:'FFEEEEEE'}},
        right: {style:'thin', color: {argb:'FFEEEEEE'}}
      };
      
      if (['galones', 'horometro', 'kilometraje'].includes(col.key)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (col.key === 'galones') {
          cell.numFmt = '#,##0.00';
        }
      } else {
         cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      }
    });
  });

  // 7. Download
  const buffer = await workbook.xlsx.writeBuffer();
  const dateSuffix = new Date().toISOString().split('T')[0];
  const blobData = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blobData, `Combustible_${dateSuffix}.xlsx`);
}
