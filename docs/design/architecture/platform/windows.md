# Windows 平台开发指南

Windows作为全球最广泛使用的桌面操作系统，在企业应用、游戏开发和桌面软件领域占据主导地位。凭借其完善的开发生态、强大的向后兼容性和丰富的商业支持，Windows平台为开发者提供了成熟稳定的开发环境。

## Windows平台特性

### 系统架构
- **内核架构**：混合内核设计，结合微内核和宏内核优势
- **多版本支持**：Windows 10/11、Server版本
- **向后兼容**：强大的兼容性保证
- **多架构支持**：x86、x64、ARM64

### 核心组件

#### Windows内核
- **NT内核**：混合内核架构，平衡性能和稳定性
- **HAL层**：硬件抽象层，支持多种硬件平台
- **驱动模型**：WDM/WDF驱动框架，设备兼容性强
- **安全子系统**：完整的权限管理和安全机制

#### .NET生态系统
- **.NET Framework**：传统Windows应用开发框架
- **.NET Core/.NET 5+**：跨平台现代化框架
- **WinRT**：Windows Runtime，现代应用API
- **UWP**：通用Windows平台应用

#### 开发框架
- **Win32 API**：传统Windows API，功能完整
- **WPF**：Windows Presentation Foundation，桌面应用UI
- **WinUI 3**：现代Windows应用UI框架
- **Windows Forms**：快速桌面应用开发

## 应用场景

### 企业应用
- **办公软件**：Microsoft Office、企业管理系统
- **业务系统**：ERP、CRM、财务管理系统
- **桌面工具**：开发工具、设计软件、系统工具
- **行业软件**：CAD、医疗信息系统、金融交易系统

### 游戏开发
- **PC游戏**：DirectX游戏开发，Steam平台
- **独立游戏**：Unity、Unreal Engine游戏开发
- **休闲游戏**：Windows Store游戏应用
- **VR/AR应用**：Windows Mixed Reality平台

### 开发工具
- **IDE环境**：Visual Studio、Visual Studio Code
- **数据库工具**：SQL Server Management Studio
- **设计工具**：Adobe Creative Suite、Autodesk软件
- **系统管理**：PowerShell、Windows Admin Center

## 技术优势

### 开发生态
- **工具完善**：Visual Studio提供完整的开发体验
- **框架丰富**：.NET生态系统成熟完善
- **文档齐全**：Microsoft提供详细的技术文档
- **社区支持**：活跃的开发者社区和技术论坛

### 商业支持
- **技术支持**：Microsoft提供专业技术支持
- **认证体系**：完整的技术认证和培训体系
- **合作伙伴**：丰富的ISV和解决方案提供商
- **企业服务**：面向企业的定制化服务

### 兼容性
- **向后兼容**：强大的向后兼容性保证
- **硬件支持**：广泛的硬件厂商支持
- **软件兼容**：丰富的第三方软件生态
- **标准支持**：支持主流的行业标准

### 开发环境
```powershell
# 安装Chocolatey包管理器
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安装开发工具
choco install visualstudio2022community -y
choco install git -y
choco install nodejs -y
choco install python -y
choco install docker-desktop -y
choco install vscode -y

# 安装Windows SDK
choco install windows-sdk-10-version-2004-all -y

# 验证安装
node --version
python --version
git --version
docker --version
```

## .NET开发

### .NET Core/5+ 应用开发
```csharp
// Program.cs - 控制台应用
using System;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace WindowsApp
{
    class Program
    {
        static async Task Main(string[] args)
        {
            // 创建主机构建器
            var host = Host.CreateDefaultBuilder(args)
                .ConfigureServices((context, services) =>
                {
                    services.AddSingleton<IApplicationService, ApplicationService>();
                    services.AddLogging();
                })
                .Build();

            // 获取服务并运行
            var app = host.Services.GetRequiredService<IApplicationService>();
            await app.RunAsync();
        }
    }

    public interface IApplicationService
    {
        Task RunAsync();
    }

    public class ApplicationService : IApplicationService
    {
        private readonly ILogger<ApplicationService> _logger;

        public ApplicationService(ILogger<ApplicationService> logger)
        {
            _logger = logger;
        }

        public async Task RunAsync()
        {
            _logger.LogInformation("Windows应用程序启动");

            // 系统信息获取
            var systemInfo = GetSystemInfo();
            _logger.LogInformation($"系统信息: {systemInfo}");

            // 异步操作示例
            await ProcessDataAsync();

            _logger.LogInformation("应用程序完成");
        }

        private string GetSystemInfo()
        {
            return $"OS: {Environment.OSVersion}, " +
                   $"Machine: {Environment.MachineName}, " +
                   $"User: {Environment.UserName}, " +
                   $"Processors: {Environment.ProcessorCount}";
        }

        private async Task ProcessDataAsync()
        {
            _logger.LogInformation("开始数据处理...");
            
            // 模拟异步操作
            await Task.Delay(1000);
            
            _logger.LogInformation("数据处理完成");
        }
    }
}
```

### WPF桌面应用开发
```xml
<!-- MainWindow.xaml -->
<Window x:Class="WpfApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Windows WPF应用" Height="450" Width="800">
    <Grid>
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>
        
        <!-- 工具栏 -->
        <ToolBar Grid.Row="0">
            <Button Name="OpenButton" Content="打开" Click="OpenButton_Click"/>
            <Button Name="SaveButton" Content="保存" Click="SaveButton_Click"/>
            <Separator/>
            <Button Name="AboutButton" Content="关于" Click="AboutButton_Click"/>
        </ToolBar>
        
        <!-- 主内容区 -->
        <TabControl Grid.Row="1">
            <TabItem Header="文本编辑器">
                <TextBox Name="TextEditor" 
                         AcceptsReturn="True" 
                         AcceptsTab="True"
                         VerticalScrollBarVisibility="Auto"
                         HorizontalScrollBarVisibility="Auto"/>
            </TabItem>
            <TabItem Header="系统信息">
                <ScrollViewer>
                    <StackPanel Name="SystemInfoPanel" Margin="10"/>
                </ScrollViewer>
            </TabItem>
            <TabItem Header="文件浏览器">
                <Grid>
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="200"/>
                        <ColumnDefinition Width="*"/>
                    </Grid.ColumnDefinitions>
                    <TreeView Name="FolderTreeView" Grid.Column="0"/>
                    <ListView Name="FileListView" Grid.Column="1">
                        <ListView.View>
                            <GridView>
                                <GridViewColumn Header="名称" DisplayMemberBinding="{Binding Name}"/>
                                <GridViewColumn Header="大小" DisplayMemberBinding="{Binding Size}"/>
                                <GridViewColumn Header="修改时间" DisplayMemberBinding="{Binding LastModified}"/>
                            </GridView>
                        </ListView.View>
                    </ListView>
                </Grid>
            </TabItem>
        </TabControl>
        
        <!-- 状态栏 -->
        <StatusBar Grid.Row="2">
            <StatusBarItem>
                <TextBlock Name="StatusText" Text="就绪"/>
            </StatusBarItem>
            <StatusBarItem HorizontalAlignment="Right">
                <TextBlock Name="TimeText"/>
            </StatusBarItem>
        </StatusBar>
    </Grid>
</Window>
```

```csharp
// MainWindow.xaml.cs
using System;
using System.Collections.ObjectModel;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using Microsoft.Win32;

namespace WpfApp
{
    public partial class MainWindow : Window
    {
        private DispatcherTimer _timer;
        private ObservableCollection<FileItem> _fileItems;

        public MainWindow()
        {
            InitializeComponent();
            InitializeApplication();
        }

        private void InitializeApplication()
        {
            // 初始化定时器
            _timer = new DispatcherTimer();
            _timer.Interval = TimeSpan.FromSeconds(1);
            _timer.Tick += Timer_Tick;
            _timer.Start();

            // 初始化文件列表
            _fileItems = new ObservableCollection<FileItem>();
            FileListView.ItemsSource = _fileItems;

            // 加载系统信息
            LoadSystemInfo();
            
            // 初始化文件浏览器
            InitializeFileExplorer();
        }

        private void Timer_Tick(object sender, EventArgs e)
        {
            TimeText.Text = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        }

        private void LoadSystemInfo()
        {
            SystemInfoPanel.Children.Clear();
            
            var systemInfo = new[]
            {
                $"操作系统: {Environment.OSVersion}",
                $"计算机名: {Environment.MachineName}",
                $"用户名: {Environment.UserName}",
                $"处理器数量: {Environment.ProcessorCount}",
                $"系统目录: {Environment.SystemDirectory}",
                $"工作目录: {Environment.CurrentDirectory}",
                $".NET版本: {Environment.Version}",
                $"64位操作系统: {Environment.Is64BitOperatingSystem}",
                $"64位进程: {Environment.Is64BitProcess}"
            };

            foreach (var info in systemInfo)
            {
                var textBlock = new TextBlock
                {
                    Text = info,
                    Margin = new Thickness(0, 2, 0, 2)
                };
                SystemInfoPanel.Children.Add(textBlock);
            }
        }

        private void InitializeFileExplorer()
        {
            // 加载驱动器
            var drives = DriveInfo.GetDrives();
            foreach (var drive in drives)
            {
                if (drive.IsReady)
                {
                    var item = new TreeViewItem
                    {
                        Header = $"{drive.Name} ({drive.DriveType})",
                        Tag = drive.RootDirectory
                    };
                    item.Items.Add("Loading...");
                    item.Expanded += TreeViewItem_Expanded;
                    FolderTreeView.Items.Add(item);
                }
            }
        }

        private void TreeViewItem_Expanded(object sender, RoutedEventArgs e)
        {
            var item = (TreeViewItem)sender;
            if (item.Items.Count == 1 && item.Items[0] is string)
            {
                item.Items.Clear();
                var directory = (DirectoryInfo)item.Tag;
                
                try
                {
                    foreach (var subDir in directory.GetDirectories())
                    {
                        var subItem = new TreeViewItem
                        {
                            Header = subDir.Name,
                            Tag = subDir
                        };
                        subItem.Items.Add("Loading...");
                        subItem.Expanded += TreeViewItem_Expanded;
                        item.Items.Add(subItem);
                    }
                }
                catch (UnauthorizedAccessException)
                {
                    // 忽略无权限访问的目录
                }
            }
        }

        private void OpenButton_Click(object sender, RoutedEventArgs e)
        {
            var openFileDialog = new OpenFileDialog
            {
                Filter = "文本文件 (*.txt)|*.txt|所有文件 (*.*)|*.*"
            };

            if (openFileDialog.ShowDialog() == true)
            {
                try
                {
                    TextEditor.Text = File.ReadAllText(openFileDialog.FileName);
                    StatusText.Text = $"已打开: {openFileDialog.FileName}";
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"打开文件失败: {ex.Message}", "错误", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void SaveButton_Click(object sender, RoutedEventArgs e)
        {
            var saveFileDialog = new SaveFileDialog
            {
                Filter = "文本文件 (*.txt)|*.txt|所有文件 (*.*)|*.*"
            };

            if (saveFileDialog.ShowDialog() == true)
            {
                try
                {
                    File.WriteAllText(saveFileDialog.FileName, TextEditor.Text);
                    StatusText.Text = $"已保存: {saveFileDialog.FileName}";
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"保存文件失败: {ex.Message}", "错误", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void AboutButton_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Windows WPF应用示例\n版本 1.0\n\n这是一个展示WPF功能的示例应用程序。", 
                          "关于", MessageBoxButton.OK, MessageBoxImage.Information);
        }
    }

    public class FileItem
    {
        public string Name { get; set; }
        public string Size { get; set; }
        public string LastModified { get; set; }
    }
}
```

### Windows服务开发
```csharp
// WindowsService.cs
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace WindowsServiceApp
{
    public class WindowsBackgroundService : BackgroundService
    {
        private readonly ILogger<WindowsBackgroundService> _logger;
        private readonly IServiceProvider _serviceProvider;

        public WindowsBackgroundService(ILogger<WindowsBackgroundService> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Windows服务启动");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await DoWorkAsync(stoppingToken);
                    await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    // 服务正在停止
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "服务执行过程中发生错误");
                    await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                }
            }

            _logger.LogInformation("Windows服务停止");
        }

        private async Task DoWorkAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var workService = scope.ServiceProvider.GetRequiredService<IWorkService>();
            
            await workService.ProcessAsync(cancellationToken);
        }

        public override async Task StartAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("服务正在启动...");
            await base.StartAsync(cancellationToken);
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("服务正在停止...");
            await base.StopAsync(cancellationToken);
        }
    }

    public interface IWorkService
    {
        Task ProcessAsync(CancellationToken cancellationToken);
    }

    public class WorkService : IWorkService
    {
        private readonly ILogger<WorkService> _logger;

        public WorkService(ILogger<WorkService> logger)
        {
            _logger = logger;
        }

        public async Task ProcessAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("开始处理工作任务");

            // 模拟工作负载
            await Task.Delay(5000, cancellationToken);

            // 执行实际工作
            await PerformSystemMaintenance();
            await ProcessFiles();
            await CheckSystemHealth();

            _logger.LogInformation("工作任务完成");
        }

        private async Task PerformSystemMaintenance()
        {
            _logger.LogInformation("执行系统维护任务");
            
            // 清理临时文件
            var tempPath = Path.GetTempPath();
            var tempFiles = Directory.GetFiles(tempPath, "*.tmp")
                                   .Where(f => File.GetCreationTime(f) < DateTime.Now.AddDays(-7));
            
            foreach (var file in tempFiles)
            {
                try
                {
                    File.Delete(file);
                    _logger.LogDebug($"删除临时文件: {file}");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, $"无法删除文件: {file}");
                }
            }
            
            await Task.CompletedTask;
        }

        private async Task ProcessFiles()
        {
            _logger.LogInformation("处理文件任务");
            
            // 监控特定目录的文件变化
            var watchPath = @"C:\Temp\Watch";
            if (Directory.Exists(watchPath))
            {
                var files = Directory.GetFiles(watchPath, "*.txt");
                foreach (var file in files)
                {
                    try
                    {
                        var content = await File.ReadAllTextAsync(file);
                        _logger.LogInformation($"处理文件: {file}, 大小: {content.Length} 字符");
                        
                        // 处理完成后移动文件
                        var processedPath = Path.Combine(watchPath, "Processed");
                        Directory.CreateDirectory(processedPath);
                        
                        var newPath = Path.Combine(processedPath, Path.GetFileName(file));
                        File.Move(file, newPath);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"处理文件失败: {file}");
                    }
                }
            }
        }

        private async Task CheckSystemHealth()
        {
            _logger.LogInformation("检查系统健康状态");
            
            // 检查磁盘空间
            var drives = DriveInfo.GetDrives();
            foreach (var drive in drives)
            {
                if (drive.IsReady)
                {
                    var freeSpacePercent = (double)drive.AvailableFreeSpace / drive.TotalSize * 100;
                    
                    if (freeSpacePercent < 10)
                    {
                        _logger.LogWarning($"磁盘空间不足: {drive.Name} 剩余 {freeSpacePercent:F1}%");
                    }
                    else
                    {
                        _logger.LogDebug($"磁盘状态正常: {drive.Name} 剩余 {freeSpacePercent:F1}%");
                    }
                }
            }
            
            // 检查内存使用情况
            var process = Process.GetCurrentProcess();
            var memoryMB = process.WorkingSet64 / 1024 / 1024;
            _logger.LogDebug($"当前进程内存使用: {memoryMB} MB");
            
            await Task.CompletedTask;
        }
    }
}
```

```csharp
// Program.cs - Windows服务主程序
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace WindowsServiceApp
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var host = Host.CreateDefaultBuilder(args)
                .UseWindowsService(options =>
                {
                    options.ServiceName = "MyWindowsService";
                })
                .ConfigureServices((context, services) =>
                {
                    services.AddHostedService<WindowsBackgroundService>();
                    services.AddScoped<IWorkService, WorkService>();
                })
                .ConfigureLogging((context, logging) =>
                {
                    logging.AddEventLog();
                })
                .Build();

            await host.RunAsync();
        }
    }
}
```

## Win32 API编程

### 系统信息获取
```csharp
// SystemInfo.cs
using System;
using System.Runtime.InteropServices;
using System.Text;

namespace Win32ApiDemo
{
    public static class SystemInfo
    {
        [DllImport("kernel32.dll")]
        static extern void GetSystemInfo(out SYSTEM_INFO lpSystemInfo);

        [DllImport("kernel32.dll")]
        static extern bool GlobalMemoryStatusEx(ref MEMORYSTATUSEX lpBuffer);

        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool GetComputerName(StringBuilder lpBuffer, ref int lpnSize);

        [DllImport("advapi32.dll", SetLastError = true)]
        static extern bool GetUserName(StringBuilder lpBuffer, ref int lpnSize);

        [DllImport("kernel32.dll")]
        static extern uint GetTickCount();

        [StructLayout(LayoutKind.Sequential)]
        public struct SYSTEM_INFO
        {
            public ushort processorArchitecture;
            public ushort reserved;
            public uint pageSize;
            public IntPtr minimumApplicationAddress;
            public IntPtr maximumApplicationAddress;
            public IntPtr activeProcessorMask;
            public uint numberOfProcessors;
            public uint processorType;
            public uint allocationGranularity;
            public ushort processorLevel;
            public ushort processorRevision;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct MEMORYSTATUSEX
        {
            public uint dwLength;
            public uint dwMemoryLoad;
            public ulong ullTotalPhys;
            public ulong ullAvailPhys;
            public ulong ullTotalPageFile;
            public ulong ullAvailPageFile;
            public ulong ullTotalVirtual;
            public ulong ullAvailVirtual;
            public ulong ullAvailExtendedVirtual;
        }

        public static void DisplaySystemInfo()
        {
            Console.WriteLine("=== Windows系统信息 ===");

            // 获取系统信息
            GetSystemInfo(out SYSTEM_INFO sysInfo);
            Console.WriteLine($"处理器架构: {GetProcessorArchitecture(sysInfo.processorArchitecture)}");
            Console.WriteLine($"处理器数量: {sysInfo.numberOfProcessors}");
            Console.WriteLine($"页面大小: {sysInfo.pageSize} bytes");
            Console.WriteLine($"分配粒度: {sysInfo.allocationGranularity} bytes");

            // 获取内存信息
            var memStatus = new MEMORYSTATUSEX { dwLength = (uint)Marshal.SizeOf<MEMORYSTATUSEX>() };
            if (GlobalMemoryStatusEx(ref memStatus))
            {
                Console.WriteLine($"\n=== 内存信息 ===");
                Console.WriteLine($"内存使用率: {memStatus.dwMemoryLoad}%");
                Console.WriteLine($"总物理内存: {memStatus.ullTotalPhys / 1024 / 1024} MB");
                Console.WriteLine($"可用物理内存: {memStatus.ullAvailPhys / 1024 / 1024} MB");
                Console.WriteLine($"总虚拟内存: {memStatus.ullTotalVirtual / 1024 / 1024} MB");
                Console.WriteLine($"可用虚拟内存: {memStatus.ullAvailVirtual / 1024 / 1024} MB");
            }

            // 获取计算机名
            var computerName = new StringBuilder(256);
            int size = computerName.Capacity;
            if (GetComputerName(computerName, ref size))
            {
                Console.WriteLine($"\n计算机名: {computerName}");
            }

            // 获取用户名
            var userName = new StringBuilder(256);
            size = userName.Capacity;
            if (GetUserName(userName, ref size))
            {
                Console.WriteLine($"用户名: {userName}");
            }

            // 获取系统运行时间
            uint tickCount = GetTickCount();
            var uptime = TimeSpan.FromMilliseconds(tickCount);
            Console.WriteLine($"系统运行时间: {uptime.Days}天 {uptime.Hours}小时 {uptime.Minutes}分钟");
        }

        private static string GetProcessorArchitecture(ushort architecture)
        {
            return architecture switch
            {
                0 => "x86",
                5 => "ARM",
                6 => "IA64",
                9 => "x64",
                12 => "ARM64",
                _ => "Unknown"
            };
        }
    }
}
```

### 窗口管理
```csharp
// WindowManager.cs
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

namespace Win32ApiDemo
{
    public static class WindowManager
    {
        [DllImport("user32.dll")]
        static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

        [DllImport("user32.dll")]
        static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll")]
        static extern int GetWindowTextLength(IntPtr hWnd);

        [DllImport("user32.dll")]
        static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll")]
        static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll")]
        static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

        [DllImport("user32.dll")]
        static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

        [DllImport("user32.dll")]
        static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

        public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [StructLayout(LayoutKind.Sequential)]
        public struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        public class WindowInfo
        {
            public IntPtr Handle { get; set; }
            public string Title { get; set; }
            public uint ProcessId { get; set; }
            public string ProcessName { get; set; }
            public RECT Rectangle { get; set; }
            public bool IsVisible { get; set; }
        }

        public static List<WindowInfo> GetAllWindows()
        {
            var windows = new List<WindowInfo>();

            EnumWindows((hWnd, lParam) =>
            {
                if (IsWindowVisible(hWnd))
                {
                    int length = GetWindowTextLength(hWnd);
                    if (length > 0)
                    {
                        var title = new StringBuilder(length + 1);
                        GetWindowText(hWnd, title, title.Capacity);

                        GetWindowThreadProcessId(hWnd, out uint processId);
                        GetWindowRect(hWnd, out RECT rect);

                        string processName = "Unknown";
                        try
                        {
                            var process = Process.GetProcessById((int)processId);
                            processName = process.ProcessName;
                        }
                        catch
                        {
                            // 忽略无法访问的进程
                        }

                        windows.Add(new WindowInfo
                        {
                            Handle = hWnd,
                            Title = title.ToString(),
                            ProcessId = processId,
                            ProcessName = processName,
                            Rectangle = rect,
                            IsVisible = true
                        });
                    }
                }
                return true;
            }, IntPtr.Zero);

            return windows;
        }

        public static void DisplayWindows()
        {
            Console.WriteLine("=== 当前窗口列表 ===");
            var windows = GetAllWindows();

            foreach (var window in windows)
            {
                Console.WriteLine($"标题: {window.Title}");
                Console.WriteLine($"进程: {window.ProcessName} (PID: {window.ProcessId})");
                Console.WriteLine($"位置: ({window.Rectangle.Left}, {window.Rectangle.Top}) - ({window.Rectangle.Right}, {window.Rectangle.Bottom})");
                Console.WriteLine($"大小: {window.Rectangle.Right - window.Rectangle.Left} x {window.Rectangle.Bottom - window.Rectangle.Top}");
                Console.WriteLine("---");
            }
        }

        public static bool MoveWindow(string windowTitle, int x, int y, int width, int height)
        {
            IntPtr hWnd = FindWindow(null, windowTitle);
            if (hWnd != IntPtr.Zero)
            {
                return SetWindowPos(hWnd, IntPtr.Zero, x, y, width, height, 0x0040); // SWP_SHOWWINDOW
            }
            return false;
        }

        public static bool MinimizeWindow(string windowTitle)
        {
            IntPtr hWnd = FindWindow(null, windowTitle);
            if (hWnd != IntPtr.Zero)
            {
                return ShowWindow(hWnd, 2); // SW_SHOWMINIMIZED
            }
            return false;
        }

        public static bool MaximizeWindow(string windowTitle)
        {
            IntPtr hWnd = FindWindow(null, windowTitle);
            if (hWnd != IntPtr.Zero)
            {
                return ShowWindow(hWnd, 3); // SW_SHOWMAXIMIZED
            }
            return false;
        }
    }
}
```

## PowerShell自动化

### 系统管理脚本
```powershell
# SystemManagement.ps1

# 设置执行策略
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

# 系统信息收集函数
function Get-DetailedSystemInfo {
    [CmdletBinding()]
    param()
    
    Write-Host "=== 详细系统信息 ===" -ForegroundColor Green
    
    # 基本系统信息
    $computerInfo = Get-ComputerInfo
    Write-Host "计算机名: $($computerInfo.CsName)" -ForegroundColor Yellow
    Write-Host "操作系统: $($computerInfo.WindowsProductName)" -ForegroundColor Yellow
    Write-Host "版本: $($computerInfo.WindowsVersion)" -ForegroundColor Yellow
    Write-Host "构建号: $($computerInfo.WindowsBuildLabEx)" -ForegroundColor Yellow
    Write-Host "总内存: $([math]::Round($computerInfo.TotalPhysicalMemory / 1GB, 2)) GB" -ForegroundColor Yellow
    
    # CPU信息
    $cpu = Get-WmiObject -Class Win32_Processor
    Write-Host "\n=== CPU信息 ===" -ForegroundColor Green
    Write-Host "处理器: $($cpu.Name)" -ForegroundColor Yellow
    Write-Host "核心数: $($cpu.NumberOfCores)" -ForegroundColor Yellow
    Write-Host "逻辑处理器: $($cpu.NumberOfLogicalProcessors)" -ForegroundColor Yellow
    Write-Host "当前时钟速度: $($cpu.CurrentClockSpeed) MHz" -ForegroundColor Yellow
    
    # 磁盘信息
    Write-Host "\n=== 磁盘信息 ===" -ForegroundColor Green
    $disks = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
    foreach ($disk in $disks) {
        $freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)
        $totalSizeGB = [math]::Round($disk.Size / 1GB, 2)
        $usedSpaceGB = $totalSizeGB - $freeSpaceGB
        $percentFree = [math]::Round(($freeSpaceGB / $totalSizeGB) * 100, 2)
        
        Write-Host "驱动器 $($disk.DeviceID)" -ForegroundColor Yellow
        Write-Host "  总大小: $totalSizeGB GB" -ForegroundColor White
        Write-Host "  已使用: $usedSpaceGB GB" -ForegroundColor White
        Write-Host "  可用空间: $freeSpaceGB GB ($percentFree%)" -ForegroundColor White
        
        if ($percentFree -lt 10) {
            Write-Host "  警告: 磁盘空间不足!" -ForegroundColor Red
        }
    }
    
    # 网络适配器信息
    Write-Host "\n=== 网络适配器 ===" -ForegroundColor Green
    $adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }
    foreach ($adapter in $adapters) {
        Write-Host "适配器: $($adapter.Name)" -ForegroundColor Yellow
        Write-Host "  状态: $($adapter.Status)" -ForegroundColor White
        Write-Host "  速度: $($adapter.LinkSpeed)" -ForegroundColor White
        
        $ipConfig = Get-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue
        if ($ipConfig) {
            Write-Host "  IP地址: $($ipConfig.IPAddress)" -ForegroundColor White
        }
    }
}

# 性能监控函数
function Start-PerformanceMonitoring {
    [CmdletBinding()]
    param(
        [int]$DurationMinutes = 5,
        [int]$IntervalSeconds = 10
    )
    
    Write-Host "开始性能监控 ($DurationMinutes 分钟)..." -ForegroundColor Green
    
    $endTime = (Get-Date).AddMinutes($DurationMinutes)
    $results = @()
    
    while ((Get-Date) -lt $endTime) {
        $cpu = Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 1 -MaxSamples 1
        $memory = Get-Counter "\Memory\Available MBytes" -SampleInterval 1 -MaxSamples 1
        $disk = Get-Counter "\PhysicalDisk(_Total)\% Disk Time" -SampleInterval 1 -MaxSamples 1
        
        $cpuUsage = [math]::Round($cpu.CounterSamples[0].CookedValue, 2)
        $availableMemoryMB = [math]::Round($memory.CounterSamples[0].CookedValue, 2)
        $diskUsage = [math]::Round($disk.CounterSamples[0].CookedValue, 2)
        
        $result = [PSCustomObject]@{
            Timestamp = Get-Date
            CPUUsage = $cpuUsage
            AvailableMemoryMB = $availableMemoryMB
            DiskUsage = $diskUsage
        }
        
        $results += $result
        
        Write-Host "$(Get-Date -Format 'HH:mm:ss') - CPU: $cpuUsage% | 可用内存: $availableMemoryMB MB | 磁盘: $diskUsage%" -ForegroundColor Cyan
        
        Start-Sleep -Seconds $IntervalSeconds
    }
    
    # 生成报告
    $avgCPU = ($results | Measure-Object -Property CPUUsage -Average).Average
    $avgMemory = ($results | Measure-Object -Property AvailableMemoryMB -Average).Average
    $avgDisk = ($results | Measure-Object -Property DiskUsage -Average).Average
    
    Write-Host "\n=== 性能监控报告 ===" -ForegroundColor Green
    Write-Host "平均CPU使用率: $([math]::Round($avgCPU, 2))%" -ForegroundColor Yellow
    Write-Host "平均可用内存: $([math]::Round($avgMemory, 2)) MB" -ForegroundColor Yellow
    Write-Host "平均磁盘使用率: $([math]::Round($avgDisk, 2))%" -ForegroundColor Yellow
    
    return $results
}

# 系统清理函数
function Invoke-SystemCleanup {
    [CmdletBinding()]
    param(
        [switch]$CleanTemp,
        [switch]$CleanRecycleBin,
        [switch]$CleanBrowserCache,
        [switch]$UpdateWindows
    )
    
    Write-Host "开始系统清理..." -ForegroundColor Green
    
    if ($CleanTemp) {
        Write-Host "清理临时文件..." -ForegroundColor Yellow
        
        $tempPaths = @(
            $env:TEMP,
            "$env:LOCALAPPDATA\Temp",
            "$env:WINDIR\Temp"
        )
        
        foreach ($path in $tempPaths) {
            if (Test-Path $path) {
                $files = Get-ChildItem -Path $path -Recurse -Force -ErrorAction SilentlyContinue
                $totalSize = ($files | Measure-Object -Property Length -Sum).Sum / 1MB
                
                Write-Host "  清理 $path (约 $([math]::Round($totalSize, 2)) MB)" -ForegroundColor White
                
                try {
                    Remove-Item -Path "$path\*" -Recurse -Force -ErrorAction SilentlyContinue
                    Write-Host "  完成" -ForegroundColor Green
                }
                catch {
                    Write-Host "  部分文件无法删除 (可能正在使用)" -ForegroundColor Yellow
                }
            }
        }
    }
    
    if ($CleanRecycleBin) {
        Write-Host "清空回收站..." -ForegroundColor Yellow
        try {
            Clear-RecycleBin -Force -ErrorAction Stop
            Write-Host "  完成" -ForegroundColor Green
        }
        catch {
            Write-Host "  清空回收站失败: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    if ($CleanBrowserCache) {
        Write-Host "清理浏览器缓存..." -ForegroundColor Yellow
        
        # Chrome缓存
        $chromePath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
        if (Test-Path $chromePath) {
            try {
                Remove-Item -Path "$chromePath\*" -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "  Chrome缓存已清理" -ForegroundColor Green
            }
            catch {
                Write-Host "  Chrome缓存清理失败" -ForegroundColor Yellow
            }
        }
        
        # Edge缓存
        $edgePath = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"
        if (Test-Path $edgePath) {
            try {
                Remove-Item -Path "$edgePath\*" -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "  Edge缓存已清理" -ForegroundColor Green
            }
            catch {
                Write-Host "  Edge缓存清理失败" -ForegroundColor Yellow
            }
        }
    }
    
    if ($UpdateWindows) {
        Write-Host "检查Windows更新..." -ForegroundColor Yellow
        
        try {
            # 需要PSWindowsUpdate模块
            if (-not (Get-Module -ListAvailable -Name PSWindowsUpdate)) {
                Write-Host "  安装PSWindowsUpdate模块..." -ForegroundColor White
                Install-Module -Name PSWindowsUpdate -Force -Scope CurrentUser
            }
            
            Import-Module PSWindowsUpdate
            $updates = Get-WUList
            
            if ($updates.Count -gt 0) {
                Write-Host "  发现 $($updates.Count) 个更新" -ForegroundColor White
                Write-Host "  开始安装更新..." -ForegroundColor White
                Install-WindowsUpdate -AcceptAll -AutoReboot:$false
            }
            else {
                Write-Host "  系统已是最新版本" -ForegroundColor Green
            }
        }
        catch {
            Write-Host "  Windows更新检查失败: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host "系统清理完成!" -ForegroundColor Green
}

# 服务管理函数
function Manage-WindowsServices {
    [CmdletBinding()]
    param(
        [string]$Action = "List",
        [string]$ServiceName = ""
    )
    
    switch ($Action.ToLower()) {
        "list" {
            Write-Host "=== Windows服务列表 ===" -ForegroundColor Green
            $services = Get-Service | Sort-Object Status, Name
            
            $runningCount = ($services | Where-Object { $_.Status -eq 'Running' }).Count
            $stoppedCount = ($services | Where-Object { $_.Status -eq 'Stopped' }).Count
            
            Write-Host "运行中: $runningCount | 已停止: $stoppedCount | 总计: $($services.Count)" -ForegroundColor Yellow
            
            foreach ($service in $services) {
                $color = if ($service.Status -eq 'Running') { 'Green' } else { 'Red' }
                Write-Host "$($service.Name.PadRight(30)) $($service.Status.ToString().PadRight(10)) $($service.DisplayName)" -ForegroundColor $color
            }
        }
        
        "start" {
            if ($ServiceName) {
                try {
                    Start-Service -Name $ServiceName
                    Write-Host "服务 '$ServiceName' 已启动" -ForegroundColor Green
                }
                catch {
                    Write-Host "启动服务失败: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
        
        "stop" {
            if ($ServiceName) {
                try {
                    Stop-Service -Name $ServiceName -Force
                    Write-Host "服务 '$ServiceName' 已停止" -ForegroundColor Green
                }
                catch {
                    Write-Host "停止服务失败: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
        
        "restart" {
            if ($ServiceName) {
                try {
                    Restart-Service -Name $ServiceName -Force
                    Write-Host "服务 '$ServiceName' 已重启" -ForegroundColor Green
                }
                catch {
                    Write-Host "重启服务失败: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
    }
}

# 主菜单函数
function Show-MainMenu {
    Clear-Host
    Write-Host "=== Windows系统管理工具 ===" -ForegroundColor Cyan
    Write-Host "1. 显示系统信息" -ForegroundColor White
    Write-Host "2. 性能监控" -ForegroundColor White
    Write-Host "3. 系统清理" -ForegroundColor White
    Write-Host "4. 服务管理" -ForegroundColor White
    Write-Host "5. 退出" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "请选择操作 (1-5)"
    
    switch ($choice) {
        "1" { Get-DetailedSystemInfo; Read-Host "按回车键继续"; Show-MainMenu }
        "2" { 
            $duration = Read-Host "监控时长(分钟,默认5)"
            if (-not $duration) { $duration = 5 }
            Start-PerformanceMonitoring -DurationMinutes $duration
            Read-Host "按回车键继续"
            Show-MainMenu
        }
        "3" {
            Write-Host "清理选项:" -ForegroundColor Yellow
            $cleanTemp = (Read-Host "清理临时文件? (y/n)") -eq 'y'
            $cleanBin = (Read-Host "清空回收站? (y/n)") -eq 'y'
            $cleanBrowser = (Read-Host "清理浏览器缓存? (y/n)") -eq 'y'
            
            Invoke-SystemCleanup -CleanTemp:$cleanTemp -CleanRecycleBin:$cleanBin -CleanBrowserCache:$cleanBrowser
            Read-Host "按回车键继续"
            Show-MainMenu
        }
        "4" {
            Manage-WindowsServices -Action "List"
            Read-Host "按回车键继续"
            Show-MainMenu
        }
        "5" { Write-Host "再见!" -ForegroundColor Green; exit }
        default { Write-Host "无效选择" -ForegroundColor Red; Start-Sleep 2; Show-MainMenu }
    }
}

# 启动主菜单
if ($MyInvocation.InvocationName -ne '.') {
    Show-MainMenu
}
```

### 自动化部署脚本
```powershell
# DeploymentScript.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$ApplicationPath,
    
    [Parameter(Mandatory=$true)]
    [string]$TargetPath,
    
    [string]$ServiceName = "",
    
    [switch]$CreateBackup,
    
    [switch]$RestartIIS
)

# 日志函数
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARN" { Write-Host $logMessage -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        default { Write-Host $logMessage -ForegroundColor White }
    }
    
    # 写入日志文件
    $logFile = "deployment_$(Get-Date -Format 'yyyyMMdd').log"
    Add-Content -Path $logFile -Value $logMessage
}

# 创建备份
function New-Backup {
    param(
        [string]$SourcePath,
        [string]$BackupPath
    )
    
    try {
        if (Test-Path $SourcePath) {
            $backupName = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
            $fullBackupPath = Join-Path $BackupPath $backupName
            
            Write-Log "创建备份: $SourcePath -> $fullBackupPath"
            Copy-Item -Path $SourcePath -Destination $fullBackupPath -Recurse -Force
            Write-Log "备份创建成功" "SUCCESS"
            
            return $fullBackupPath
        }
        else {
            Write-Log "源路径不存在，跳过备份" "WARN"
            return $null
        }
    }
    catch {
        Write-Log "备份创建失败: $($_.Exception.Message)" "ERROR"
        throw
    }
}

# 停止服务
function Stop-ApplicationService {
    param([string]$ServiceName)
    
    if ($ServiceName) {
        try {
            $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
            if ($service -and $service.Status -eq 'Running') {
                Write-Log "停止服务: $ServiceName"
                Stop-Service -Name $ServiceName -Force -ErrorAction Stop
                
                # 等待服务完全停止
                $timeout = 30
                $elapsed = 0
                while ((Get-Service -Name $ServiceName).Status -ne 'Stopped' -and $elapsed -lt $timeout) {
                    Start-Sleep -Seconds 1
                    $elapsed++
                }
                
                if ((Get-Service -Name $ServiceName).Status -eq 'Stopped') {
                    Write-Log "服务已停止" "SUCCESS"
                }
                else {
                    Write-Log "服务停止超时" "WARN"
                }
            }
            else {
                Write-Log "服务未运行或不存在" "WARN"
            }
        }
        catch {
            Write-Log "停止服务失败: $($_.Exception.Message)" "ERROR"
            throw
        }
    }
}

# 启动服务
function Start-ApplicationService {
    param([string]$ServiceName)
    
    if ($ServiceName) {
        try {
            $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
            if ($service) {
                Write-Log "启动服务: $ServiceName"
                Start-Service -Name $ServiceName -ErrorAction Stop
                
                # 等待服务完全启动
                $timeout = 30
                $elapsed = 0
                while ((Get-Service -Name $ServiceName).Status -ne 'Running' -and $elapsed -lt $timeout) {
                    Start-Sleep -Seconds 1
                    $elapsed++
                }
                
                if ((Get-Service -Name $ServiceName).Status -eq 'Running') {
                    Write-Log "服务已启动" "SUCCESS"
                }
                else {
                    Write-Log "服务启动超时" "ERROR"
                    throw "服务启动失败"
                }
            }
            else {
                Write-Log "服务不存在" "ERROR"
                throw "服务不存在"
            }
        }
        catch {
            Write-Log "启动服务失败: $($_.Exception.Message)" "ERROR"
            throw
        }
    }
}

# 部署应用程序
function Deploy-Application {
    param(
        [string]$SourcePath,
        [string]$DestinationPath
    )
    
    try {
        Write-Log "开始部署应用程序"
        Write-Log "源路径: $SourcePath"
        Write-Log "目标路径: $DestinationPath"
        
        # 验证源路径
        if (-not (Test-Path $SourcePath)) {
            throw "源路径不存在: $SourcePath"
        }
        
        # 创建目标目录
        if (-not (Test-Path $DestinationPath)) {
            Write-Log "创建目标目录: $DestinationPath"
            New-Item -Path $DestinationPath -ItemType Directory -Force | Out-Null
        }
        
        # 复制文件
        Write-Log "复制文件..."
        $sourceItems = Get-ChildItem -Path $SourcePath -Recurse
        $totalItems = $sourceItems.Count
        $currentItem = 0
        
        foreach ($item in $sourceItems) {
            $currentItem++
            $relativePath = $item.FullName.Substring($SourcePath.Length + 1)
            $destinationItem = Join-Path $DestinationPath $relativePath
            
            if ($item.PSIsContainer) {
                if (-not (Test-Path $destinationItem)) {
                    New-Item -Path $destinationItem -ItemType Directory -Force | Out-Null
                }
            }
            else {
                $destinationDir = Split-Path $destinationItem -Parent
                if (-not (Test-Path $destinationDir)) {
                    New-Item -Path $destinationDir -ItemType Directory -Force | Out-Null
                }
                
                Copy-Item -Path $item.FullName -Destination $destinationItem -Force
            }
            
            # 显示进度
            $percent = [math]::Round(($currentItem / $totalItems) * 100, 1)
            Write-Progress -Activity "部署应用程序" -Status "复制文件 ($currentItem/$totalItems)" -PercentComplete $percent
        }
        
        Write-Progress -Activity "部署应用程序" -Completed
        Write-Log "文件复制完成" "SUCCESS"
    }
    catch {
        Write-Log "部署失败: $($_.Exception.Message)" "ERROR"
        throw
    }
}

# 主部署流程
try {
    Write-Log "=== 开始部署流程 ===" "SUCCESS"
    
    # 创建备份
    if ($CreateBackup -and (Test-Path $TargetPath)) {
        $backupPath = Split-Path $TargetPath -Parent
        $backupLocation = New-Backup -SourcePath $TargetPath -BackupPath $backupPath
    }
    
    # 停止服务
    Stop-ApplicationService -ServiceName $ServiceName
    
    # 停止IIS（如果需要）
    if ($RestartIIS) {
        Write-Log "停止IIS"
        iisreset /stop
    }
    
    # 部署应用程序
    Deploy-Application -SourcePath $ApplicationPath -DestinationPath $TargetPath
    
    # 启动IIS（如果需要）
    if ($RestartIIS) {
        Write-Log "启动IIS"
        iisreset /start
    }
    
    # 启动服务
    Start-ApplicationService -ServiceName $ServiceName
    
    Write-Log "=== 部署完成 ===" "SUCCESS"
    
    # 验证部署
    Write-Log "验证部署..."
    if (Test-Path $TargetPath) {
        $deployedFiles = (Get-ChildItem -Path $TargetPath -Recurse -File).Count
        Write-Log "已部署 $deployedFiles 个文件" "SUCCESS"
    }
    
    if ($ServiceName) {
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($service -and $service.Status -eq 'Running') {
            Write-Log "服务运行正常" "SUCCESS"
        }
        else {
            Write-Log "服务状态异常" "WARN"
        }
    }
}
catch {
    Write-Log "部署失败: $($_.Exception.Message)" "ERROR"
    
    # 回滚（如果有备份）
    if ($CreateBackup -and $backupLocation) {
        Write-Log "开始回滚到备份版本" "WARN"
        try {
            # 删除失败的部署
            if (Test-Path $TargetPath) {
                Remove-Item -Path $TargetPath -Recurse -Force
            }
            
            # 恢复备份
            Copy-Item -Path $backupLocation -Destination $TargetPath -Recurse -Force
            Write-Log "回滚完成" "SUCCESS"
            
            # 重新启动服务
            Start-ApplicationService -ServiceName $ServiceName
        }
        catch {
            Write-Log "回滚失败: $($_.Exception.Message)" "ERROR"
        }
    }
    
    exit 1
}
```

## 容器化和云部署

### Docker容器化
```dockerfile
# Dockerfile for Windows containers
FROM mcr.microsoft.com/dotnet/aspnet:6.0-nanoserver-ltsc2022 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:6.0-nanoserver-ltsc2022 AS build
WORKDIR /src
COPY ["WindowsApp/WindowsApp.csproj", "WindowsApp/"]
RUN dotnet restore "WindowsApp/WindowsApp.csproj"
COPY . .
WORKDIR "/src/WindowsApp"
RUN dotnet build "WindowsApp.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "WindowsApp.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "WindowsApp.dll"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  windowsapp:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:80"
      - "8443:443"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Server=sqlserver;Database=WindowsApp;Trusted_Connection=true;
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    depends_on:
      - sqlserver
    networks:
      - app-network

  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrong@Passw0rd
      - MSSQL_PID=Express
    ports:
      - "1433:1433"
    volumes:
      - sqlserver-data:/var/opt/mssql
    networks:
      - app-network

volumes:
  sqlserver-data:

networks:
  app-network:
    driver: bridge
```

### Azure部署配置
```yaml
# azure-pipelines.yml
trigger:
- main

pool:
  vmImage: 'windows-latest'

variables:
  buildConfiguration: 'Release'
  azureSubscription: 'your-azure-subscription'
  webAppName: 'your-webapp-name'
  resourceGroupName: 'your-resource-group'

stages:
- stage: Build
  displayName: 'Build stage'
  jobs:
  - job: Build
    displayName: 'Build job'
    steps:
    - task: UseDotNet@2
      displayName: 'Use .NET 6 SDK'
      inputs:
        packageType: 'sdk'
        version: '6.0.x'

    - task: DotNetCoreCLI@2
      displayName: 'Restore packages'
      inputs:
        command: 'restore'
        projects: '**/*.csproj'

    - task: DotNetCoreCLI@2
      displayName: 'Build application'
      inputs:
        command: 'build'
        projects: '**/*.csproj'
        arguments: '--configuration $(buildConfiguration)'

    - task: DotNetCoreCLI@2
      displayName: 'Run tests'
      inputs:
        command: 'test'
        projects: '**/*Tests.csproj'
        arguments: '--configuration $(buildConfiguration) --collect "Code coverage"'

    - task: DotNetCoreCLI@2
      displayName: 'Publish application'
      inputs:
        command: 'publish'
        projects: '**/*.csproj'
        arguments: '--configuration $(buildConfiguration) --output $(Build.ArtifactStagingDirectory)'
        zipAfterPublish: true

    - task: PublishBuildArtifacts@1
      displayName: 'Publish artifacts'
      inputs:
        PathtoPublish: '$(Build.ArtifactStagingDirectory)'
        ArtifactName: 'drop'
        publishLocation: 'Container'

- stage: Deploy
  displayName: 'Deploy stage'
  dependsOn: Build
  condition: succeeded()
  jobs:
  - deployment: Deploy
    displayName: 'Deploy job'
    environment: 'production'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureWebApp@1
            displayName: 'Deploy to Azure Web App'
            inputs:
              azureSubscription: '$(azureSubscription)'
              appType: 'webApp'
              appName: '$(webAppName)'
              package: '$(Pipeline.Workspace)/drop/*.zip'
              deploymentMethod: 'auto'
```

## 性能优化

### 内存管理优化
```csharp
// MemoryOptimization.cs
using System;
using System.Buffers;
using System.IO;
using System.Threading.Tasks;

namespace WindowsOptimization
{
    public class MemoryOptimizedFileProcessor
    {
        private readonly ArrayPool<byte> _arrayPool;
        
        public MemoryOptimizedFileProcessor()
        {
            _arrayPool = ArrayPool<byte>.Shared;
        }
        
        public async Task ProcessLargeFileAsync(string filePath)
        {
            const int bufferSize = 4096;
            byte[] buffer = _arrayPool.Rent(bufferSize);
            
            try
            {
                using var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
                
                int bytesRead;
                while ((bytesRead = await fileStream.ReadAsync(buffer, 0, bufferSize)) > 0)
                {
                    // 处理数据
                    await ProcessBufferAsync(buffer.AsMemory(0, bytesRead));
                }
            }
            finally
            {
                _arrayPool.Return(buffer);
            }
        }
        
        private async Task ProcessBufferAsync(Memory<byte> buffer)
        {
            // 使用Span<T>进行高效的内存操作
            Span<byte> span = buffer.Span;
            
            // 模拟数据处理
            for (int i = 0; i < span.Length; i++)
            {
                span[i] = (byte)(span[i] ^ 0xFF); // 简单的位操作
            }
            
            await Task.Delay(1); // 模拟异步操作
        }
    }
    
    public class ObjectPoolExample<T> where T : class, new()
    {
        private readonly ConcurrentQueue<T> _objects = new();
        private readonly Func<T> _objectGenerator;
        private readonly Action<T> _resetAction;
        
        public ObjectPoolExample(Func<T> objectGenerator = null, Action<T> resetAction = null)
        {
            _objectGenerator = objectGenerator ?? (() => new T());
            _resetAction = resetAction;
        }
        
        public T Get()
        {
            if (_objects.TryDequeue(out T item))
            {
                return item;
            }
            
            return _objectGenerator();
        }
        
        public void Return(T item)
        {
            if (item != null)
            {
                _resetAction?.Invoke(item);
                _objects.Enqueue(item);
            }
        }
    }
}
```

### 并发编程优化
```csharp
// ConcurrencyOptimization.cs
using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

namespace WindowsOptimization
{
    public class HighPerformanceProcessor
    {
        private readonly Channel<WorkItem> _workChannel;
        private readonly ChannelWriter<WorkItem> _writer;
        private readonly ChannelReader<WorkItem> _reader;
        private readonly CancellationTokenSource _cancellationTokenSource;
        private readonly Task[] _workers;
        
        public HighPerformanceProcessor(int workerCount = Environment.ProcessorCount)
        {
            var options = new BoundedChannelOptions(1000)
            {
                FullMode = BoundedChannelFullMode.Wait,
                SingleReader = false,
                SingleWriter = false
            };
            
            _workChannel = Channel.CreateBounded<WorkItem>(options);
            _writer = _workChannel.Writer;
            _reader = _workChannel.Reader;
            _cancellationTokenSource = new CancellationTokenSource();
            
            // 创建工作线程
            _workers = new Task[workerCount];
            for (int i = 0; i < workerCount; i++)
            {
                _workers[i] = Task.Run(() => ProcessWorkItemsAsync(_cancellationTokenSource.Token));
            }
        }
        
        public async Task<bool> EnqueueWorkAsync(WorkItem item)
        {
            try
            {
                await _writer.WriteAsync(item);
                return true;
            }
            catch (OperationCanceledException)
            {
                return false;
            }
        }
        
        private async Task ProcessWorkItemsAsync(CancellationToken cancellationToken)
        {
            await foreach (var workItem in _reader.ReadAllAsync(cancellationToken))
            {
                try
                {
                    await ProcessWorkItemAsync(workItem);
                }
                catch (Exception ex)
                {
                    // 记录错误但继续处理其他项目
                    Console.WriteLine($"处理工作项时发生错误: {ex.Message}");
                }
            }
        }
        
        private async Task ProcessWorkItemAsync(WorkItem item)
        {
            // 模拟CPU密集型工作
            await Task.Run(() =>
            {
                var result = 0;
                for (int i = 0; i < item.Iterations; i++)
                {
                    result += i * i;
                }
                item.Result = result;
            });
            
            // 完成回调
            item.CompletionCallback?.Invoke(item);
        }
        
        public async Task ShutdownAsync()
        {
            _writer.Complete();
            _cancellationTokenSource.Cancel();
            
            try
            {
                await Task.WhenAll(_workers);
            }
            catch (OperationCanceledException)
            {
                // 预期的取消异常
            }
            
            _cancellationTokenSource.Dispose();
        }
    }
    
    public class WorkItem
    {
        public int Id { get; set; }
        public int Iterations { get; set; }
        public int Result { get; set; }
        public Action<WorkItem> CompletionCallback { get; set; }
    }
    
    // 高性能缓存实现
    public class HighPerformanceCache<TKey, TValue>
    {
        private readonly ConcurrentDictionary<TKey, CacheItem<TValue>> _cache;
        private readonly Timer _cleanupTimer;
        private readonly TimeSpan _defaultExpiration;
        
        public HighPerformanceCache(TimeSpan defaultExpiration)
        {
            _cache = new ConcurrentDictionary<TKey, CacheItem<TValue>>();
            _defaultExpiration = defaultExpiration;
            
            // 每分钟清理过期项目
            _cleanupTimer = new Timer(CleanupExpiredItems, null, TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(1));
        }
        
        public bool TryGet(TKey key, out TValue value)
        {
            if (_cache.TryGetValue(key, out var item) && !item.IsExpired)
            {
                value = item.Value;
                return true;
            }
            
            value = default;
            return false;
        }
        
        public void Set(TKey key, TValue value, TimeSpan? expiration = null)
        {
            var expirationTime = DateTime.UtcNow.Add(expiration ?? _defaultExpiration);
            var item = new CacheItem<TValue>(value, expirationTime);
            _cache.AddOrUpdate(key, item, (k, v) => item);
        }
        
        public bool Remove(TKey key)
        {
            return _cache.TryRemove(key, out _);
        }
        
        private void CleanupExpiredItems(object state)
        {
            var expiredKeys = new List<TKey>();
            
            foreach (var kvp in _cache)
            {
                if (kvp.Value.IsExpired)
                {
                    expiredKeys.Add(kvp.Key);
                }
            }
            
            foreach (var key in expiredKeys)
            {
                _cache.TryRemove(key, out _);
            }
        }
        
        public void Dispose()
        {
            _cleanupTimer?.Dispose();
        }
    }
    
    public class CacheItem<T>
    {
        public T Value { get; }
        public DateTime ExpirationTime { get; }
        public bool IsExpired => DateTime.UtcNow > ExpirationTime;
        
        public CacheItem(T value, DateTime expirationTime)
        {
            Value = value;
            ExpirationTime = expirationTime;
        }
    }
}
```

## 安全最佳实践

### 安全编程
```csharp
// SecurityBestPractices.cs
using System;
using System.Security.Cryptography;
using System.Text;
using System.IO;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;

namespace WindowsSecurity
{
    public static class CryptographyHelper
    {
        public static string HashPassword(string password)
        {
            // 生成随机盐
            byte[] salt = new byte[128 / 8];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(salt);
            }
            
            // 使用PBKDF2进行密码哈希
            string hashed = Convert.ToBase64String(KeyDerivation.Pbkdf2(
                password: password,
                salt: salt,
                prf: KeyDerivationPrf.HMACSHA256,
                iterationCount: 10000,
                numBytesRequested: 256 / 8));
            
            return $"{Convert.ToBase64String(salt)}.{hashed}";
        }
        
        public static bool VerifyPassword(string password, string hashedPassword)
        {
            var parts = hashedPassword.Split('.');
            if (parts.Length != 2) return false;
            
            var salt = Convert.FromBase64String(parts[0]);
            var hash = parts[1];
            
            string computedHash = Convert.ToBase64String(KeyDerivation.Pbkdf2(
                password: password,
                salt: salt,
                prf: KeyDerivationPrf.HMACSHA256,
                iterationCount: 10000,
                numBytesRequested: 256 / 8));
            
            return hash == computedHash;
        }
        
        public static string EncryptString(string plainText, string key)
        {
            using var aes = Aes.Create();
            aes.Key = Encoding.UTF8.GetBytes(key.PadRight(32).Substring(0, 32));
            aes.GenerateIV();
            
            using var encryptor = aes.CreateEncryptor();
            using var msEncrypt = new MemoryStream();
            using var csEncrypt = new CryptoStream(msEncrypt, encryptor, CryptoStreamMode.Write);
            using var swEncrypt = new StreamWriter(csEncrypt);
            
            swEncrypt.Write(plainText);
            swEncrypt.Close();
            
            var iv = aes.IV;
            var encrypted = msEncrypt.ToArray();
            var result = new byte[iv.Length + encrypted.Length];
            
            Buffer.BlockCopy(iv, 0, result, 0, iv.Length);
            Buffer.BlockCopy(encrypted, 0, result, iv.Length, encrypted.Length);
            
            return Convert.ToBase64String(result);
        }
        
        public static string DecryptString(string cipherText, string key)
        {
            var fullCipher = Convert.FromBase64String(cipherText);
            
            using var aes = Aes.Create();
            aes.Key = Encoding.UTF8.GetBytes(key.PadRight(32).Substring(0, 32));
            
            var iv = new byte[aes.BlockSize / 8];
            var cipher = new byte[fullCipher.Length - iv.Length];
            
            Buffer.BlockCopy(fullCipher, 0, iv, 0, iv.Length);
            Buffer.BlockCopy(fullCipher, iv.Length, cipher, 0, cipher.Length);
            
            aes.IV = iv;
            
            using var decryptor = aes.CreateDecryptor();
            using var msDecrypt = new MemoryStream(cipher);
            using var csDecrypt = new CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read);
            using var srDecrypt = new StreamReader(csDecrypt);
            
            return srDecrypt.ReadToEnd();
        }
    }
}
```

## 总结

Windows平台作为企业级应用开发的重要平台，具有以下优势：

### 平台优势
- **生态丰富**：完整的开发工具链和丰富的第三方库
- **企业支持**：Microsoft提供的专业技术支持
- **向后兼容**：强大的兼容性保证业务连续性
- **集成能力**：与Microsoft生态系统深度集成

### 适用场景
- **企业应用**：ERP、CRM、办公自动化系统
- **桌面软件**：专业工具、游戏、多媒体应用
- **Web应用**：基于.NET的Web服务和API
- **云服务**：Azure云平台应用
- **系统服务**：后台服务、定时任务、系统监控

### 发展趋势
- **云原生化**：容器化和微服务架构
- **跨平台支持**：.NET Core/5+的跨平台能力
- **现代化UI**：WinUI 3、MAUI等现代UI框架
- **AI集成**：机器学习和人工智能功能集成
- **DevOps集成**：CI/CD和自动化部署

### 学习建议
1. **基础技能**：掌握C#、.NET Framework/.NET Core
2. **开发工具**：熟练使用Visual Studio、PowerShell
3. **架构设计**：学习企业级应用架构模式
4. **云技术**：了解Azure云服务和容器化技术
5. **安全实践**：掌握Windows安全编程最佳实践

Windows平台为开发者提供了强大而完整的开发环境，是构建企业级应用和桌面软件的理想选择。