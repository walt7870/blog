# Webpack 全面指南

Webpack是一个现代JavaScript应用程序的静态模块打包器。它将项目中的所有资源（JavaScript、CSS、图片等）视为模块，并根据模块间的依赖关系进行打包，生成对应的静态资源。

## Webpack 简介

### 核心概念
- **Entry（入口）**：构建依赖图的起点
- **Output（输出）**：打包后文件的输出位置和命名
- **Loader（加载器）**：处理非JavaScript文件
- **Plugin（插件）**：执行更广泛的任务
- **Mode（模式）**：开发或生产环境的优化
- **Module（模块）**：项目中的每个文件都是一个模块

### 为什么使用Webpack？
- **模块化支持**：支持ES6、CommonJS、AMD等模块系统
- **资源管理**：统一处理JavaScript、CSS、图片等资源
- **代码分割**：按需加载，优化性能
- **开发体验**：热更新、源码映射等
- **生产优化**：压缩、Tree Shaking等
- **生态丰富**：大量的loader和plugin

## 快速开始

### 安装
```bash
# 创建项目目录
mkdir webpack-demo
cd webpack-demo

# 初始化npm项目
npm init -y

# 安装webpack
npm install webpack webpack-cli --save-dev

# 安装开发服务器
npm install webpack-dev-server --save-dev
```

### 基本项目结构
```
webpack-demo/
├── dist/
├── src/
│   ├── index.js
│   └── style.css
├── public/
│   └── index.html
├── webpack.config.js
└── package.json
```

### 基础配置
```javascript
// webpack.config.js
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  // 入口文件
  entry: './src/index.js',
  
  // 输出配置
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true // 每次构建前清理输出目录
  },
  
  // 模式
  mode: 'development',
  
  // 开发服务器
  devServer: {
    static: './dist',
    port: 8080,
    open: true,
    hot: true
  },
  
  // 插件
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    })
  ]
}
```

### package.json脚本
```json
{
  "scripts": {
    "start": "webpack serve --mode development",
    "build": "webpack --mode production",
    "dev": "webpack --mode development",
    "watch": "webpack --watch"
  }
}
```

## 核心概念详解

### 1. Entry（入口）
```javascript
// 单个入口
module.exports = {
  entry: './src/index.js'
}

// 多个入口
module.exports = {
  entry: {
    main: './src/index.js',
    admin: './src/admin.js',
    vendor: './src/vendor.js'
  }
}

// 动态入口
module.exports = {
  entry: () => {
    return {
      main: './src/index.js',
      admin: './src/admin.js'
    }
  }
}
```

### 2. Output（输出）
```javascript
module.exports = {
  output: {
    // 输出目录
    path: path.resolve(__dirname, 'dist'),
    
    // 文件名模板
    filename: '[name].[contenthash].js',
    
    // chunk文件名
    chunkFilename: '[name].[contenthash].chunk.js',
    
    // 资源文件名
    assetModuleFilename: 'assets/[name].[hash][ext]',
    
    // 公共路径
    publicPath: '/static/',
    
    // 清理输出目录
    clean: true,
    
    // 库配置（用于构建库）
    library: {
      name: 'MyLibrary',
      type: 'umd'
    }
  }
}
```

### 3. Loader（加载器）
```javascript
module.exports = {
  module: {
    rules: [
      // JavaScript/TypeScript
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript'
            ]
          }
        }
      },
      
      // CSS
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader'
        ]
      },
      
      // SCSS/Sass
      {
        test: /\.(scss|sass)$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader',
          'sass-loader'
        ]
      },
      
      // Less
      {
        test: /\.less$/,
        use: [
          'style-loader',
          'css-loader',
          'less-loader'
        ]
      },
      
      // 图片
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[hash][ext]'
        }
      },
      
      // 字体
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash][ext]'
        }
      },
      
      // 内联小文件
      {
        test: /\.(png|jpg|jpeg|gif)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024 // 8KB以下内联
          }
        }
      }
    ]
  }
}
```

### 4. Plugin（插件）
```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const DefinePlugin = require('webpack').DefinePlugin

module.exports = {
  plugins: [
    // HTML生成
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
      chunks: ['main'],
      minify: {
        removeComments: true,
        collapseWhitespace: true
      }
    }),
    
    // CSS提取
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash].css',
      chunkFilename: 'css/[name].[contenthash].chunk.css'
    }),
    
    // 清理输出目录
    new CleanWebpackPlugin(),
    
    // 复制静态文件
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'public/static',
          to: 'static'
        }
      ]
    }),
    
    // 定义全局变量
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.API_URL': JSON.stringify(process.env.API_URL)
    })
  ]
}
```

## 开发环境配置

### 开发服务器
```javascript
// webpack.dev.js
const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')

module.exports = merge(common, {
  mode: 'development',
  
  // 源码映射
  devtool: 'eval-source-map',
  
  // 开发服务器
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist')
    },
    port: 8080,
    open: true,
    hot: true,
    compress: true,
    historyApiFallback: true, // SPA路由支持
    
    // 代理配置
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        pathRewrite: {
          '^/api': ''
        }
      }
    },
    
    // 客户端日志级别
    client: {
      logging: 'info',
      overlay: {
        errors: true,
        warnings: false
      }
    }
  },
  
  // 模块配置
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader', // 开发环境使用style-loader
          'css-loader',
          'postcss-loader'
        ]
      }
    ]
  }
})
```

### 热模块替换 (HMR)
```javascript
// 在入口文件中启用HMR
if (module.hot) {
  module.hot.accept('./print.js', function() {
    console.log('Accepting the updated printMe module!')
    printMe()
  })
}

// React Hot Reload
if (module.hot) {
  module.hot.accept('./App', () => {
    const NextApp = require('./App').default
    ReactDOM.render(<NextApp />, document.getElementById('root'))
  })
}

// Vue Hot Reload
if (module.hot) {
  module.hot.accept('./App.vue', () => {
    // 重新渲染应用
  })
}
```

## 生产环境配置

### 生产构建优化
```javascript
// webpack.prod.js
const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const CompressionPlugin = require('compression-webpack-plugin')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

module.exports = merge(common, {
  mode: 'production',
  
  // 源码映射（生产环境）
  devtool: 'source-map',
  
  // 优化配置
  optimization: {
    minimize: true,
    minimizer: [
      // JavaScript压缩
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          }
        }
      }),
      
      // CSS压缩
      new CssMinimizerPlugin()
    ],
    
    // 代码分割
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // 第三方库
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
        
        // 公共代码
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true
        }
      }
    },
    
    // 运行时代码分离
    runtimeChunk: {
      name: 'runtime'
    }
  },
  
  // 模块配置
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader, // 生产环境提取CSS
          'css-loader',
          'postcss-loader'
        ]
      }
    ]
  },
  
  // 插件
  plugins: [
    // CSS提取
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash].css',
      chunkFilename: 'css/[name].[contenthash].chunk.css'
    }),
    
    // Gzip压缩
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8
    }),
    
    // 包分析（可选）
    process.env.ANALYZE && new BundleAnalyzerPlugin()
  ].filter(Boolean)
})
```

### Tree Shaking
```javascript
// package.json
{
  "sideEffects": false // 标记为无副作用
}

// 或者指定有副作用的文件
{
  "sideEffects": [
    "./src/polyfills.js",
    "*.css"
  ]
}

// webpack配置
module.exports = {
  mode: 'production', // 生产模式自动启用Tree Shaking
  optimization: {
    usedExports: true,
    sideEffects: false
  }
}

// 代码示例
// utils.js
export function add(a, b) {
  return a + b
}

export function subtract(a, b) {
  return a - b
}

// main.js
import { add } from './utils' // 只导入需要的函数

console.log(add(1, 2))
// subtract函数不会被打包
```

## 代码分割

### 入口点分割
```javascript
module.exports = {
  entry: {
    main: './src/index.js',
    vendor: './src/vendor.js'
  },
  output: {
    filename: '[name].[contenthash].js'
  }
}
```

### 动态导入
```javascript
// 动态导入模块
function loadModule() {
  import('./heavy-module.js')
    .then(module => {
      module.doSomething()
    })
    .catch(err => {
      console.error('Failed to load module:', err)
    })
}

// 路由级别的代码分割
const Home = () => import('./components/Home.vue')
const About = () => import('./components/About.vue')

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About }
]

// React懒加载
import { lazy, Suspense } from 'react'

const LazyComponent = lazy(() => import('./LazyComponent'))

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  )
}
```

### SplitChunks配置
```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      maxSize: 244000,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      
      cacheGroups: {
        // React相关
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 20
        },
        
        // UI库
        antd: {
          test: /[\\/]node_modules[\\/]antd[\\/]/,
          name: 'antd',
          chunks: 'all',
          priority: 15
        },
        
        // 其他第三方库
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
        
        // 公共代码
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true
        }
      }
    }
  }
}
```

## 常用Loader详解

### Babel Loader
```javascript
// babel.config.js
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          browsers: ['> 1%', 'last 2 versions']
        },
        useBuiltIns: 'usage',
        corejs: 3
      }
    ],
    '@babel/preset-react',
    '@babel/preset-typescript'
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-syntax-dynamic-import',
    [
      'import',
      {
        libraryName: 'antd',
        libraryDirectory: 'es',
        style: 'css'
      }
    ]
  ]
}

// webpack配置
{
  test: /\.(js|jsx|ts|tsx)$/,
  exclude: /node_modules/,
  use: {
    loader: 'babel-loader',
    options: {
      cacheDirectory: true // 启用缓存
    }
  }
}
```

### CSS Loader
```javascript
// PostCSS配置
// postcss.config.js
module.exports = {
  plugins: [
    require('autoprefixer'),
    require('cssnano')({
      preset: 'default'
    })
  ]
}

// CSS Modules
{
  test: /\.module\.css$/,
  use: [
    'style-loader',
    {
      loader: 'css-loader',
      options: {
        modules: {
          localIdentName: '[name]__[local]--[hash:base64:5]'
        }
      }
    }
  ]
}

// SCSS配置
{
  test: /\.(scss|sass)$/,
  use: [
    'style-loader',
    'css-loader',
    'postcss-loader',
    {
      loader: 'sass-loader',
      options: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  ]
}
```

### File Loader vs Asset Modules
```javascript
// 旧的file-loader方式
{
  test: /\.(png|jpg|jpeg|gif)$/,
  use: {
    loader: 'file-loader',
    options: {
      name: '[name].[hash].[ext]',
      outputPath: 'images/'
    }
  }
}

// 新的Asset Modules方式（Webpack 5+）
{
  test: /\.(png|jpg|jpeg|gif)$/,
  type: 'asset/resource',
  generator: {
    filename: 'images/[name].[hash][ext]'
  }
}

// 内联小文件
{
  test: /\.(png|jpg|jpeg|gif)$/,
  type: 'asset',
  parser: {
    dataUrlCondition: {
      maxSize: 8 * 1024
    }
  }
}
```

## 常用Plugin详解

### HTML Webpack Plugin
```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
      chunks: ['main'],
      inject: 'body',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      }
    }),
    
    // 多页面应用
    new HtmlWebpackPlugin({
      template: './public/admin.html',
      filename: 'admin.html',
      chunks: ['admin']
    })
  ]
}
```

### DefinePlugin
```javascript
const webpack = require('webpack')

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.API_URL': JSON.stringify(process.env.API_URL),
      '__VERSION__': JSON.stringify(require('./package.json').version),
      '__DEV__': process.env.NODE_ENV === 'development'
    })
  ]
}

// 在代码中使用
if (__DEV__) {
  console.log('Development mode')
}

console.log('API URL:', process.env.API_URL)
console.log('Version:', __VERSION__)
```

### ProvidePlugin
```javascript
const webpack = require('webpack')

module.exports = {
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      _: 'lodash',
      React: 'react'
    })
  ]
}

// 现在可以在任何模块中直接使用这些变量
// 无需import
$('#app').html('Hello World')
const result = _.map([1, 2, 3], x => x * 2)
```

## 性能优化

### 构建性能优化
```javascript
module.exports = {
  // 缓存
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    }
  },
  
  // 解析优化
  resolve: {
    // 减少解析步骤
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
    
    // 指定扩展名
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    
    // 别名
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'react': path.resolve(__dirname, 'node_modules/react')
    }
  },
  
  // 模块配置
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            cacheCompression: false
          }
        }
      }
    ]
  },
  
  // 忽略解析
  noParse: /jquery|lodash/,
  
  // 外部化依赖
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM'
  }
}
```

### 运行时性能优化
```javascript
// 预加载
const LazyComponent = lazy(() => {
  return import(
    /* webpackChunkName: "lazy-component" */
    /* webpackPreload: true */
    './LazyComponent'
  )
})

// 预获取
const LazyComponent = lazy(() => {
  return import(
    /* webpackChunkName: "lazy-component" */
    /* webpackPrefetch: true */
    './LazyComponent'
  )
})

// 魔法注释
import(
  /* webpackChunkName: "my-chunk-name" */
  /* webpackMode: "lazy" */
  /* webpackExports: ["default", "named"] */
  './module'
)
```

### Bundle分析
```javascript
// webpack-bundle-analyzer
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html'
    })
  ]
}

// 使用
npm run build -- --analyze
```

## 多环境配置

### 配置文件分离
```javascript
// webpack.common.js
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: './src/index.js',
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    clean: true
  },
  
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      }
    ]
  },
  
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    })
  ]
}

// webpack.dev.js
const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')

module.exports = merge(common, {
  mode: 'development',
  devtool: 'eval-source-map',
  devServer: {
    port: 8080,
    hot: true
  }
})

// webpack.prod.js
const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash].css'
    })
  ]
})
```

### 环境变量配置
```javascript
// .env.development
NODE_ENV=development
API_URL=http://localhost:3000
DEBUG=true

// .env.production
NODE_ENV=production
API_URL=https://api.example.com
DEBUG=false

// webpack.config.js
const dotenv = require('dotenv')
const webpack = require('webpack')

// 加载环境变量
const env = dotenv.config().parsed || {}

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(env)
    })
  ]
}
```

## 实际项目配置示例

### React项目配置
```javascript
// webpack.config.js
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

const isProduction = process.env.NODE_ENV === 'production'

module.exports = {
  entry: './src/index.js',
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isProduction ? '[name].[contenthash].js' : '[name].js',
    publicPath: '/'
  },
  
  mode: isProduction ? 'production' : 'development',
  devtool: isProduction ? 'source-map' : 'eval-source-map',
  
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils')
    }
  },
  
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript'
            ],
            plugins: [
              '@babel/plugin-proposal-class-properties'
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
          'postcss-loader'
        ]
      },
      {
        test: /\.(scss|sass)$/,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
          'postcss-loader',
          'sass-loader'
        ]
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024
          }
        },
        generator: {
          filename: 'images/[name].[hash][ext]'
        }
      }
    ]
  },
  
  plugins: [
    new CleanWebpackPlugin(),
    
    new HtmlWebpackPlugin({
      template: './public/index.html',
      minify: isProduction
    }),
    
    isProduction && new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash].css'
    })
  ].filter(Boolean),
  
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  },
  
  devServer: {
    port: 3000,
    open: true,
    hot: true,
    historyApiFallback: true
  }
}
```

### Vue项目配置
```javascript
// webpack.config.js
const path = require('path')
const { VueLoaderPlugin } = require('vue-loader')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const isProduction = process.env.NODE_ENV === 'production'

module.exports = {
  entry: './src/main.js',
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    clean: true
  },
  
  mode: isProduction ? 'production' : 'development',
  
  resolve: {
    extensions: ['.js', '.vue', '.ts'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'vue': 'vue/dist/vue.esm-bundler.js'
    }
  },
  
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          appendTsSuffixTo: [/\.vue$/]
        }
      },
      {
        test: /\.css$/,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : 'vue-style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.(scss|sass)$/,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : 'vue-style-loader',
          'css-loader',
          'sass-loader'
        ]
      }
    ]
  },
  
  plugins: [
    new VueLoaderPlugin(),
    
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    
    isProduction && new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash].css'
    })
  ].filter(Boolean),
  
  devServer: {
    port: 8080,
    hot: true,
    open: true
  }
}
```

## 故障排除

### 常见问题
```javascript
// 1. 模块解析问题
// 检查resolve配置
resolve: {
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  alias: {
    '@': path.resolve(__dirname, 'src')
  }
}

// 2. 循环依赖警告
// 使用插件检测
const CircularDependencyPlugin = require('circular-dependency-plugin')

plugins: [
  new CircularDependencyPlugin({
    exclude: /node_modules/,
    failOnError: true
  })
]

// 3. 内存溢出
// 增加Node.js内存限制
"scripts": {
  "build": "node --max-old-space-size=4096 node_modules/webpack/bin/webpack.js"
}

// 4. 构建速度慢
// 启用缓存
cache: {
  type: 'filesystem'
}

// 使用thread-loader
{
  test: /\.js$/,
  use: [
    'thread-loader',
    'babel-loader'
  ]
}
```

### 调试技巧
```javascript
// 1. 详细输出
stats: {
  colors: true,
  modules: true,
  reasons: true,
  errorDetails: true
}

// 2. 分析构建时间
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin')
const smp = new SpeedMeasurePlugin()

module.exports = smp.wrap({
  // webpack配置
})

// 3. 分析包大小
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

plugins: [
  new BundleAnalyzerPlugin({
    analyzerMode: 'static',
    openAnalyzer: false
  })
]
```

## 最佳实践

### 1. 配置组织
```
config/
├── webpack.common.js     # 公共配置
├── webpack.dev.js        # 开发配置
├── webpack.prod.js       # 生产配置
├── webpack.analyze.js    # 分析配置
└── paths.js             # 路径配置
```

### 2. 性能优化
```javascript
// 启用缓存
cache: {
  type: 'filesystem',
  buildDependencies: {
    config: [__filename]
  }
}

// 并行处理
const os = require('os')

module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: 'thread-loader',
            options: {
              workers: os.cpus().length - 1
            }
          },
          'babel-loader'
        ]
      }
    ]
  }
}

// 代码分割
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all'
      }
    }
  }
}
```

### 3. 开发体验
```javascript
// 错误覆盖
devServer: {
  client: {
    overlay: {
      errors: true,
      warnings: false
    }
  }
}

// 进度显示
const ProgressPlugin = require('webpack').ProgressPlugin

plugins: [
  new ProgressPlugin()
]

// 友好错误
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin')

plugins: [
  new FriendlyErrorsWebpackPlugin()
]
```

## 总结

Webpack是功能强大的模块打包器，具有以下特点：

### 优势
- **功能完整**：支持各种资源类型和模块系统
- **高度可配置**：灵活的配置选项
- **生态丰富**：大量的loader和plugin
- **成熟稳定**：经过大量项目验证
- **社区活跃**：持续更新和维护

### 适用场景
- **复杂项目**：需要精细控制构建过程
- **多页面应用**：支持多入口配置
- **企业级应用**：成熟的解决方案
- **定制需求**：高度可配置

### 学习建议
1. **理解核心概念**：Entry、Output、Loader、Plugin
2. **掌握配置技巧**：环境分离、性能优化
3. **学习常用工具**：Babel、PostCSS等
4. **实践项目**：在实际项目中应用
5. **关注生态**：了解最新的loader和plugin

Webpack虽然配置复杂，但其强大的功能和灵活性使其成为大型项目的首选构建工具。随着Webpack 5的发布，其性能和开发体验都有了显著提升。