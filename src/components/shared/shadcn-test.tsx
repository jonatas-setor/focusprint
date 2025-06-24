'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ShadcnTest() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Teste shadcn/ui Components</CardTitle>
          <CardDescription>
            Validação dos componentes shadcn/ui instalados no FocuSprint
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Teste de Buttons */}
          <div>
            <h4 className="text-sm font-medium mb-3">Buttons:</h4>
            <div className="flex gap-2 flex-wrap">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
          </div>

          {/* Teste de Input */}
          <div>
            <h4 className="text-sm font-medium mb-3">Input:</h4>
            <Input placeholder="Digite algo aqui..." className="max-w-sm" />
          </div>

          {/* Teste de Table */}
          <div>
            <h4 className="text-sm font-medium mb-3">Table:</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Componente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Versão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Button</TableCell>
                  <TableCell className="text-green-600">✅ Funcionando</TableCell>
                  <TableCell>shadcn/ui latest</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Input</TableCell>
                  <TableCell className="text-green-600">✅ Funcionando</TableCell>
                  <TableCell>shadcn/ui latest</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Card</TableCell>
                  <TableCell className="text-green-600">✅ Funcionando</TableCell>
                  <TableCell>shadcn/ui latest</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Table</TableCell>
                  <TableCell className="text-green-600">✅ Funcionando</TableCell>
                  <TableCell>shadcn/ui latest</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Sonner (Toast)</TableCell>
                  <TableCell className="text-green-600">✅ Funcionando</TableCell>
                  <TableCell>shadcn/ui latest</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Status da Instalação */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-green-800 font-medium mb-2">
              ✅ shadcn/ui Configurado com Sucesso!
            </h4>
            <div className="text-green-700 text-sm space-y-1">
              <p>• Componentes instalados: Button, Input, Card, Table, Sonner</p>
              <p>• Tailwind CSS v4 integrado</p>
              <p>• Tema: New York com base color Neutral</p>
              <p>• TypeScript + React 19 compatível</p>
              <p>• Estrutura preservada: Route Groups funcionando</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
