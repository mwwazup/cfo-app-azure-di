import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../contexts/auth-context';

export function DatabaseTest() {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    console.log('DB Test:', message);
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testDatabaseConnection = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      addResult('Starting database tests...');
      
      // Test 1: Check if user is authenticated
      addResult(`User authenticated: ${!!user} (ID: ${user?.id})`);
      
      // Test 2: Check Supabase connection
      const { data: connectionTest, error: connectionError } = await supabase
        .from('momentum_entries')
        .select('count', { count: 'exact', head: true });
      
      if (connectionError) {
        addResult(`❌ Connection test failed: ${connectionError.message}`);
      } else {
        addResult(`✅ Connected to Supabase successfully`);
      }
      
      // Test 3: Check table structure
      const { data: tableInfo, error: tableError } = await supabase
        .rpc('get_table_info', { table_name: 'momentum_entries' })
        .single();
      
      if (tableError) {
        addResult(`⚠️ Could not get table info: ${tableError.message}`);
      } else {
        addResult(`✅ Table structure accessible`);
      }
      
      // Test 4: Try to insert a test record
      if (user?.id) {
        const testEntry = {
          user_id: user.id,
          month: '2025-01',
          section: 'test',
          content: 'Test entry from database test',
          is_draft: true
        };
        
        const { data: insertData, error: insertError } = await supabase
          .from('momentum_entries')
          .insert(testEntry)
          .select()
          .single();
        
        if (insertError) {
          addResult(`❌ Insert test failed: ${insertError.message} (Code: ${insertError.code})`);
          addResult(`Insert error details: ${JSON.stringify(insertError.details)}`);
        } else {
          addResult(`✅ Insert test successful: ${insertData.id}`);
          
          // Clean up test record
          await supabase
            .from('momentum_entries')
            .delete()
            .eq('id', insertData.id);
          addResult(`✅ Test record cleaned up`);
        }
      } else {
        addResult(`⚠️ Cannot test insert: No user ID`);
      }
      
      // Test 5: Check RLS policies
      const { data: rlsData, error: rlsError } = await supabase
        .from('momentum_entries')
        .select('*')
        .limit(1);
      
      if (rlsError) {
        addResult(`❌ RLS test failed: ${rlsError.message}`);
      } else {
        addResult(`✅ RLS policies working (can query table)`);
      }
      
    } catch (error) {
      addResult(`❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Database Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testDatabaseConnection} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Testing...' : 'Run Database Tests'}
        </Button>
        
        {testResults.length > 0 && (
          <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            {testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono mb-1">
                {result}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
