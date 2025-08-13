# CSV Import Functionality for Group Members

## Overview

The GroupDetails page now includes CSV import functionality that allows administrators to bulk import members to a specific group. This feature streamlines the process of adding multiple members to a group without having to manually add them one by one.

## Features

### 1. Download Sample CSV
- Users can download a sample CSV file that shows the correct format
- The sample file includes example data with proper column headers
- File is named `group_{groupId}_members_sample.csv`

### 2. CSV Import
- Supports importing multiple members at once
- Validates data before processing
- Provides detailed error reporting for failed imports
- Automatically refreshes the member list after successful imports

### 3. Data Validation
- Validates member ID exists in the system
- Ensures month dates are within the group's time period
- Checks for duplicate month assignments
- Validates CSV format and required fields

## CSV Format

### Required Columns
- `memberId`: The ID of the member (must be an existing member ID)
- `assignedMonthDate`: The month to assign the member (format: YYYY-MM)

### Example CSV Content
```csv
memberId,assignedMonthDate
1,2024-01
2,2024-02
3,2024-03
```

## Usage Instructions

### 1. Prepare Your CSV File
- Create a CSV file with the required columns
- Ensure member IDs exist in your system
- Use YYYY-MM format for month dates
- Make sure months are within the group's start and end dates

### 2. Import Process
1. Navigate to the Group Details page
2. Scroll to the "Group Members" section
3. Click "Download Sample CSV" to see the correct format
4. Click "Import CSV" and select your file
5. Review the import results
6. Close the results when done

### 3. Validation Rules
- **Member ID**: Must be a positive integer and exist in the system
- **Month Date**: Must be in YYYY-MM format (e.g., 2024-01)
- **Group Period**: Month must be within the group's start and end dates
- **Available Slots**: Cannot exceed the group's maximum member capacity
- **Duplicate Prevention**: Cannot assign the same month to multiple members

## Error Handling

### Common Import Errors
- **Member Not Found**: Member ID doesn't exist in the system
- **Invalid Month Format**: Month date is not in YYYY-MM format
- **Month Outside Group Period**: Month is not within the group's time range
- **Slot Already Taken**: Month is already assigned to another member
- **Insufficient Slots**: Trying to import more members than available slots

### Error Display
- Errors are shown in a dedicated results panel
- Each error includes the row number and specific issue
- Users can close the results panel when done reviewing

## Technical Implementation

### Files Modified
- `src/pages/GroupDetails.tsx`: Added CSV import functionality
- `src/pages/GroupDetails.css`: Added styling for import UI

### Key Functions
- `downloadSampleCSV()`: Generates and downloads sample CSV
- `parseCSV()`: Parses and validates CSV content
- `handleCSVImport()`: Processes the CSV file and imports members

### State Management
- `csvImportResult`: Stores import results and errors
- `isImporting`: Tracks import process status

## Benefits

1. **Efficiency**: Import multiple members at once instead of individual additions
2. **Accuracy**: Automated validation reduces human error
3. **Bulk Operations**: Handle large member lists efficiently
4. **Audit Trail**: Clear reporting of import results and errors
5. **User Experience**: Intuitive interface with helpful guidance

## Limitations

- CSV must be properly formatted with exact column names
- Member IDs must already exist in the system
- Month dates must be within the group's defined period
- Cannot exceed the group's maximum member capacity
- File size should be reasonable (typically under 1MB)

## Future Enhancements

Potential improvements could include:
- Support for additional member data fields
- Batch validation before import
- Import templates for different group types
- Export functionality for existing group members
- Integration with member creation workflows
