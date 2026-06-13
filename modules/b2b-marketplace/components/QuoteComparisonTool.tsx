import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const QuoteComparisonTool: React.FC = () => {
    return (
        <Card className="w-full mt-6">
            <CardHeader>
                <CardTitle>Received Quotes</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Seller</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Delivery</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">Techive Supplies PLC</TableCell>
                            <TableCell>45,000 ETB</TableCell>
                            <TableCell>5 Days</TableCell>
                            <TableCell><Badge variant="outline" className="text-yellow-500">Pending</Badge></TableCell>
                            <TableCell className="text-right"><Button variant="outline" size="sm">Review</Button></TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">Global Imports Co.</TableCell>
                            <TableCell>42,500 ETB</TableCell>
                            <TableCell>14 Days</TableCell>
                            <TableCell><Badge variant="outline" className="text-yellow-500">Pending</Badge></TableCell>
                            <TableCell className="text-right"><Button variant="outline" size="sm">Review</Button></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default QuoteComparisonTool;
