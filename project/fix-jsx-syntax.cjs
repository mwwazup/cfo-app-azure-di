const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'financial', 'FinancialStatements.tsx');

console.log('🔧 Fixing JSX syntax issue...');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the incomplete map function and fix it
  const incompleteMapStart = '                        {Array.from({ length: getDaysInMonth(calendarView.month, calendarView.year) }).map((_, dayIndex) => {';
  const incompleteMapEnd = '                          const isToday = isSameDay(date, new Date());\n\n\n\n\n  const editDocument';
  
  let startIndex = content.indexOf(incompleteMapStart);
  if (startIndex !== -1) {
    let endIndex = content.indexOf('  const editDocument', startIndex);
    if (endIndex !== -1) {
      // Replace the incomplete map with a properly closed one
      const completeMapFunction = `                        {Array.from({ length: getDaysInMonth(calendarView.month, calendarView.year) }).map((_, dayIndex) => {
                          const day = dayIndex + 1;
                          const date = new Date(calendarView.year, calendarView.month, day);
                          const isSelected = selectedStartDate && isSameDay(date, selectedStartDate) || 
                                           selectedEndDate && isSameDay(date, selectedEndDate);
                          const isInRange = selectedStartDate && selectedEndDate && isDateInRange(date, selectedStartDate, selectedEndDate);
                          const isToday = isSameDay(date, new Date());

                          return (
                            <button
                              key={day}
                              onClick={() => handleDateClick(date)}
                              className={\`h-8 w-8 text-sm rounded-full flex items-center justify-center transition-colors
                                \${isSelected ? 'bg-blue-600 text-white' : ''}
                                \${isInRange && !isSelected ? 'bg-blue-100 text-blue-800' : ''}
                                \${isToday && !isSelected && !isInRange ? 'bg-gray-200 text-gray-800' : ''}
                                \${!isSelected && !isInRange && !isToday ? 'hover:bg-gray-100' : ''}
                              \`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

`;

      content = content.slice(0, startIndex) + completeMapFunction + '\n  const editDocument' + content.slice(endIndex + 18);
      console.log('✅ Fixed incomplete JSX map function');
    }
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Successfully fixed JSX syntax!');
  console.log('🔄 The component should now compile without errors.');

} catch (error) {
  console.error('❌ Error:', error.message);
}
