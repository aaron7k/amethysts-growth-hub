
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Documentation = () => {
  return (
 

      <Card>
        <CardHeader>
          <CardTitle>Manual del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <iframe
            src="https://canary-trip-904.notion.site/ebd/2013695dbbc880a88986fc7277ffe877"
            width="100%"
            height="600"
            frameBorder="0"
            allowFullScreen
            className="rounded-b-lg"
            title="Documentación del Sistema"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Documentation;
