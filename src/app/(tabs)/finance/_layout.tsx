import { Stack } from 'expo-router';

export default function FinanceLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Financial Dashboard',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="add-expense" 
        options={{ 
          title: 'Add General Expense',
          headerShown: true,
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="edit-expense" 
        options={{ 
          title: 'Edit General Expense',
          headerShown: true,
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="edit-budget" 
        options={{ 
          title: 'Set Budget',
          headerShown: true,
          presentation: 'modal'
        }} 
      />
    </Stack>
  );
}
