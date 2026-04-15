declare module 'bpmn-js/lib/Modeler' {
  const BpmnModeler: any;
  export default BpmnModeler;
}
declare module 'bpmn-js/lib/NavigatedViewer' {
  const BpmnViewer: any;
  export default BpmnViewer;
}
declare module 'bpmn-js-properties-panel' {
  export const BpmnPropertiesPanelModule: any;
  export const BpmnPropertiesProviderModule: any;
}
declare module 'diagram-js-minimap' {
  const MinimapModule: any;
  export default MinimapModule;
}
declare module 'camunda-bpmn-moddle/resources/camunda.json' {
  const camundaModdle: any;
  export default camundaModdle;
}
declare module 'bpmn-js-token-simulation' {
  const TokenSimulationModule: any;
  export default TokenSimulationModule;
}
declare module 'bpmn-js-bpmnlint' {
  const BpmnlintModule: any;
  export default BpmnlintModule;
}

declare module 'dmn-js/lib/Modeler' {
  const DmnModeler: any;
  export default DmnModeler;
}

declare module '@bpmn-io/form-js-editor' {
  export class FormEditor {
    constructor(options: { container: HTMLElement; schema?: object; properties?: object });
    importSchema(schema: object): Promise<void>;
    exportSchema(): object;
    on(event: string, callback: (event: object) => void): void;
    off(event: string, callback: (event: object) => void): void;
    destroy(): void;
    attachTo(element: HTMLElement): void;
  }
}

declare module '@bpmn-io/form-js-viewer' {
  export class Form {
    constructor(options: { container: HTMLElement; schema?: object; data?: object });
    importSchema(schema: object, data?: object): Promise<void>;
    on(event: string, callback: (event: object) => void): void;
    off(event: string, callback: (event: object) => void): void;
    destroy(): void;
    attachTo(element: HTMLElement): void;
  }
}
