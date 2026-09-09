import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  /** Qué se estaba mostrando. Sale en el aviso para orientar a quien reporta. */
  label: string;
  children: React.ReactNode;
  /** Se invoca al pedir volver al inicio. */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Contiene un fallo de render dentro del apartado que lo provocó.
 *
 * Sin esto, un error en cualquier vista —un dato con forma inesperada llegando
 * del servidor, por ejemplo— desmonta el árbol entero de React: pantalla en
 * blanco, sin mensaje y sin forma de volver. En una terminal de tienda eso
 * significa cerrar y reabrir la aplicación con gente esperando en la caja.
 *
 * Tiene que ser un componente de clase: React no ofrece captura de errores de
 * render con hooks.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // La consola de la terminal es lo primero que mira soporte.
    console.error(`Fallo en «${this.props.label}»:`, error, info.componentStack);
  }

  /** Al cambiar de apartado se limpia: el fallo era de la vista anterior. */
  componentDidUpdate(prev: Props) {
    if (prev.label !== this.props.label && this.state.error) {
      this.setState({ error: null });
    }
  }

  private retry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="h-full flex items-center justify-center p-6 bg-canvas">
        <div className="max-w-md text-center space-y-4">
          <span className="w-12 h-12 mx-auto rounded-lg bg-danger-soft text-danger flex items-center justify-center">
            <AlertOctagon className="w-6 h-6" aria-hidden />
          </span>
          <div className="space-y-1.5">
            <h2 className="text-title text-ink">No se pudo mostrar «{this.props.label}»</h2>
            <p className="text-base text-ink-2 leading-relaxed">
              El resto de la terminal sigue funcionando: puede seguir cobrando desde el punto de
              venta mientras se resuelve.
            </p>
          </div>

          {/* El mensaje técnico, disponible sin gritar: quien reporta la
              incidencia necesita copiarlo, y a nadie más le sirve. */}
          <details className="text-left">
            <summary className="text-body text-ink-3 cursor-pointer hover:text-ink-2">
              Detalle técnico
            </summary>
            <pre className="mt-2 p-3 rounded-md bg-sunken border border-line text-micro text-ink-2 overflow-x-auto whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
          </details>

          <div className="flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={this.retry}
            >
              Reintentar
            </Button>
            {this.props.onReset && (
              <Button
                onClick={() => {
                  this.retry();
                  this.props.onReset?.();
                }}
              >
                Ir al inicio
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
