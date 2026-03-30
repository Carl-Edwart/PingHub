import os

screens = {
    r'c:\Users\Kadu\Documents\projetos\PingHub\src\screens\atletas\AtletaFormScreen.tsx': 'AtletaFormScreen',
    r'c:\Users\Kadu\Documents\projetos\PingHub\src\screens\atletas\AtletaPerfilScreen.tsx': 'AtletaPerfilScreen',
    r'c:\Users\Kadu\Documents\projetos\PingHub\src\screens\estudo\EstudoBibliotecaScreen.tsx': 'EstudoBibliotecaScreen',
    r'c:\Users\Kadu\Documents\projetos\PingHub\src\screens\estudo\EstudoConteudoScreen.tsx': 'EstudoConteudoScreen',
    r'c:\Users\Kadu\Documents\projetos\PingHub\src\screens\regras\RegrasListScreen.tsx': 'RegrasListScreen',
    r'c:\Users\Kadu\Documents\projetos\PingHub\src\screens\regras\RegrasDetalheScreen.tsx': 'RegrasDetalheScreen',
    r'c:\Users\Kadu\Documents\projetos\PingHub\src\screens\mesa\MesaStatusScreen.tsx': 'MesaStatusScreen',
    r'c:\Users\Kadu\Documents\projetos\PingHub\src\screens\mesa\MesaFilaScreen.tsx': 'MesaFilaScreen',
}

for path, comp in screens.items():
    content = f"""import React from 'react';
import {{ View, Text }} from 'react-native';

export default function {comp}() {{
  return (
    <View style={{{{ flex: 1, justifyContent: 'center', alignItems: 'center' }}}}>
      <Text>{comp}</Text>
    </View>
  );
}}
"""
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ {comp}')
