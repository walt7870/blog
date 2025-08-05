# Angular 全面指南

Angular是由Google开发和维护的开源Web应用框架，基于TypeScript构建。它是一个完整的平台，提供了构建现代Web应用所需的所有工具和功能。

## Angular 简介

### 核心特性
- **TypeScript优先**：原生支持TypeScript，提供强类型检查
- **组件化架构**：基于组件的开发模式
- **依赖注入**：强大的依赖注入系统
- **双向数据绑定**：自动同步模型和视图
- **指令系统**：扩展HTML功能
- **服务和模块**：代码组织和复用
- **CLI工具**：强大的命令行工具
- **完整生态**：路由、HTTP客户端、表单处理等

### Angular版本
- **AngularJS (1.x)**：第一代Angular，基于JavaScript
- **Angular 2+**：完全重写，基于TypeScript
- **Angular 15+**：最新版本，独立组件、更好的性能

> 注意：本文主要介绍Angular 2+版本，不是AngularJS

## 快速开始

### 环境准备
```bash
# 安装Node.js (推荐LTS版本)
# 安装Angular CLI
npm install -g @angular/cli

# 验证安装
ng version
```

### 创建新项目
```bash
# 创建新的Angular项目
ng new my-angular-app

# 选择配置选项
# - 是否添加Angular路由？(Y/n)
# - 选择样式表格式 (CSS/SCSS/Sass/Less)

# 进入项目目录
cd my-angular-app

# 启动开发服务器
ng serve

# 或者指定端口
ng serve --port 4200
```

### 项目结构
```
my-angular-app/
├── src/
│   ├── app/
│   │   ├── app.component.ts      # 根组件
│   │   ├── app.component.html    # 根组件模板
│   │   ├── app.component.css     # 根组件样式
│   │   ├── app.component.spec.ts # 根组件测试
│   │   ├── app.module.ts         # 根模块
│   │   └── app-routing.module.ts # 路由模块
│   ├── assets/                   # 静态资源
│   ├── environments/             # 环境配置
│   ├── index.html               # 主HTML文件
│   ├── main.ts                  # 应用入口
│   └── styles.css               # 全局样式
├── angular.json                 # Angular配置
├── package.json                 # 依赖配置
└── tsconfig.json               # TypeScript配置
```

## Angular核心概念

### 1. 组件 (Components)

#### 基本组件
```typescript
// user.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent {
  @Input() user!: User;
  @Input() showActions: boolean = true;
  @Output() userClick = new EventEmitter<User>();
  @Output() deleteUser = new EventEmitter<number>();
  
  onUserClick(): void {
    this.userClick.emit(this.user);
  }
  
  onDeleteClick(event: Event): void {
    event.stopPropagation();
    this.deleteUser.emit(this.user.id);
  }
}
```

```html
<!-- user.component.html -->
<div class="user-card" (click)="onUserClick()">
  <img 
    [src]="user.avatar || '/assets/default-avatar.png'" 
    [alt]="user.name"
    class="avatar"
  >
  <div class="user-info">
    <h3>{{ user.name }}</h3>
    <p>{{ user.email }}</p>
  </div>
  <div class="actions" *ngIf="showActions">
    <button 
      class="btn btn-danger" 
      (click)="onDeleteClick($event)"
    >
      删除
    </button>
  </div>
</div>
```

```css
/* user.component.css */
.user-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.user-card:hover {
  background-color: #f5f5f5;
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  margin-right: 16px;
}

.user-info {
  flex: 1;
}

.user-info h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
}

.user-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.actions {
  margin-left: 16px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}
```

#### 组件生命周期
```typescript
import { 
  Component, 
  OnInit, 
  OnDestroy, 
  OnChanges, 
  SimpleChanges,
  AfterViewInit,
  Input
} from '@angular/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-lifecycle-demo',
  template: `
    <div>
      <h2>Lifecycle Demo</h2>
      <p>Count: {{ count }}</p>
      <p>Input value: {{ inputValue }}</p>
    </div>
  `
})
export class LifecycleDemoComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @Input() inputValue: string = '';
  
  count: number = 0;
  private subscription: Subscription = new Subscription();
  private timer: any;
  
  constructor() {
    console.log('Constructor called');
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    console.log('ngOnChanges called', changes);
    if (changes['inputValue']) {
      console.log('Input value changed:', changes['inputValue'].currentValue);
    }
  }
  
  ngOnInit(): void {
    console.log('ngOnInit called');
    
    // 初始化数据、订阅服务等
    this.timer = setInterval(() => {
      this.count++;
    }, 1000);
  }
  
  ngAfterViewInit(): void {
    console.log('ngAfterViewInit called');
    // 视图初始化完成后的操作
  }
  
  ngOnDestroy(): void {
    console.log('ngOnDestroy called');
    
    // 清理工作：取消订阅、清除定时器等
    this.subscription.unsubscribe();
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
```

### 2. 模板语法

#### 数据绑定
```html
<!-- 插值表达式 -->
<h1>{{ title }}</h1>
<p>{{ user.name | uppercase }}</p>
<p>{{ 1 + 1 }}</p>
<p>{{ getMessage() }}</p>

<!-- 属性绑定 -->
<img [src]="imageUrl" [alt]="imageAlt">
<button [disabled]="isDisabled">Click me</button>
<div [class.active]="isActive">Active div</div>
<div [style.color]="textColor">Colored text</div>

<!-- 事件绑定 -->
<button (click)="onClick()">Click me</button>
<input (keyup)="onKeyUp($event)" (blur)="onBlur()">
<form (submit)="onSubmit($event)">Submit</form>

<!-- 双向数据绑定 -->
<input [(ngModel)]="username" placeholder="Username">
<p>Hello, {{ username }}!</p>

<!-- 模板引用变量 -->
<input #nameInput type="text">
<button (click)="greet(nameInput.value)">Greet</button>
```

#### 结构指令
```html
<!-- *ngIf 条件渲染 -->
<div *ngIf="isLoggedIn; else loginTemplate">
  <p>Welcome back!</p>
</div>
<ng-template #loginTemplate>
  <p>Please log in</p>
</ng-template>

<!-- *ngFor 列表渲染 -->
<ul>
  <li *ngFor="let item of items; let i = index; trackBy: trackByFn">
    {{ i + 1 }}. {{ item.name }}
  </li>
</ul>

<!-- *ngSwitch 多条件渲染 -->
<div [ngSwitch]="userRole">
  <p *ngSwitchCase="'admin'">Admin Panel</p>
  <p *ngSwitchCase="'user'">User Dashboard</p>
  <p *ngSwitchDefault>Guest View</p>
</div>

<!-- ng-container 分组元素 -->
<ng-container *ngIf="showContent">
  <h2>Title</h2>
  <p>Content</p>
</ng-container>
```

#### 管道 (Pipes)
```html
<!-- 内置管道 -->
<p>{{ message | uppercase }}</p>
<p>{{ message | lowercase }}</p>
<p>{{ price | currency:'USD':'symbol':'1.2-2' }}</p>
<p>{{ today | date:'yyyy-MM-dd' }}</p>
<p>{{ data | json }}</p>
<p>{{ items | slice:0:5 }}</p>

<!-- 链式管道 -->
<p>{{ message | uppercase | slice:0:10 }}</p>

<!-- 自定义管道 -->
<p>{{ text | truncate:50 }}</p>
```

```typescript
// 自定义管道
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate'
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit: number = 50, trail: string = '...'): string {
    if (!value) return '';
    
    return value.length > limit 
      ? value.substring(0, limit) + trail 
      : value;
  }
}
```

### 3. 服务和依赖注入

#### 创建服务
```typescript
// user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface User {
  id: number;
  name: string;
  email: string;
}

@Injectable({
  providedIn: 'root' // 单例服务
})
export class UserService {
  private apiUrl = '/api/users';
  private usersSubject = new BehaviorSubject<User[]>([]);
  public users$ = this.usersSubject.asObservable();
  
  constructor(private http: HttpClient) {
    this.loadUsers();
  }
  
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }
  
  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }
  
  createUser(user: Omit<User, 'id'>): Observable<User> {
    return this.http.post<User>(this.apiUrl, user).pipe(
      map(newUser => {
        const currentUsers = this.usersSubject.value;
        this.usersSubject.next([...currentUsers, newUser]);
        return newUser;
      })
    );
  }
  
  updateUser(id: number, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user).pipe(
      map(updatedUser => {
        const currentUsers = this.usersSubject.value;
        const index = currentUsers.findIndex(u => u.id === id);
        if (index !== -1) {
          currentUsers[index] = updatedUser;
          this.usersSubject.next([...currentUsers]);
        }
        return updatedUser;
      })
    );
  }
  
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      map(() => {
        const currentUsers = this.usersSubject.value;
        this.usersSubject.next(currentUsers.filter(u => u.id !== id));
      })
    );
  }
  
  private loadUsers(): void {
    this.getUsers().subscribe(users => {
      this.usersSubject.next(users);
    });
  }
}
```

#### 在组件中使用服务
```typescript
// user-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { UserService, User } from '../services/user.service';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit, OnDestroy {
  users: User[] = [];
  loading: boolean = false;
  error: string | null = null;
  private subscription: Subscription = new Subscription();
  
  constructor(private userService: UserService) {}
  
  ngOnInit(): void {
    this.loadUsers();
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  loadUsers(): void {
    this.loading = true;
    this.error = null;
    
    const sub = this.userService.users$.subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load users';
        this.loading = false;
        console.error('Error loading users:', error);
      }
    });
    
    this.subscription.add(sub);
  }
  
  onDeleteUser(userId: number): void {
    if (confirm('Are you sure you want to delete this user?')) {
      const sub = this.userService.deleteUser(userId).subscribe({
        next: () => {
          console.log('User deleted successfully');
        },
        error: (error) => {
          this.error = 'Failed to delete user';
          console.error('Error deleting user:', error);
        }
      });
      
      this.subscription.add(sub);
    }
  }
}
```

### 4. 模块 (Modules)

#### 根模块
```typescript
// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { UserListComponent } from './components/user-list/user-list.component';
import { UserComponent } from './components/user/user.component';
import { TruncatePipe } from './pipes/truncate.pipe';

@NgModule({
  declarations: [
    AppComponent,
    UserListComponent,
    UserComponent,
    TruncatePipe
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

#### 特性模块
```typescript
// user.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { UserRoutingModule } from './user-routing.module';
import { UserListComponent } from './components/user-list/user-list.component';
import { UserDetailComponent } from './components/user-detail/user-detail.component';
import { UserFormComponent } from './components/user-form/user-form.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [
    UserListComponent,
    UserDetailComponent,
    UserFormComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    UserRoutingModule,
    SharedModule
  ],
  exports: [
    UserListComponent // 如果需要在其他模块中使用
  ]
})
export class UserModule { }
```

#### 共享模块
```typescript
// shared.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { TruncatePipe } from './pipes/truncate.pipe';
import { HighlightDirective } from './directives/highlight.directive';

@NgModule({
  declarations: [
    LoadingSpinnerComponent,
    ConfirmDialogComponent,
    TruncatePipe,
    HighlightDirective
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  exports: [
    // 导出常用模块
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    // 导出共享组件
    LoadingSpinnerComponent,
    ConfirmDialogComponent,
    TruncatePipe,
    HighlightDirective
  ]
})
export class SharedModule { }
```

## Angular路由

### 基本路由配置
```typescript
// app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { AboutComponent } from './components/about/about.component';
import { NotFoundComponent } from './components/not-found/not-found.component';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { 
    path: 'users', 
    loadChildren: () => import('./modules/user/user.module').then(m => m.UserModule)
  },
  { path: '**', component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
```

### 嵌套路由和路由参数
```typescript
// user-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserListComponent } from './components/user-list/user-list.component';
import { UserDetailComponent } from './components/user-detail/user-detail.component';
import { UserFormComponent } from './components/user-form/user-form.component';
import { AuthGuard } from '../core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: UserListComponent },
      { path: 'new', component: UserFormComponent, canActivate: [AuthGuard] },
      { path: ':id', component: UserDetailComponent },
      { path: ':id/edit', component: UserFormComponent, canActivate: [AuthGuard] }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRoutingModule { }
```

### 路由守卫
```typescript
// auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.authService.isAuthenticated$.pipe(
      map(isAuthenticated => {
        if (isAuthenticated) {
          return true;
        } else {
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
          });
          return false;
        }
      })
    );
  }
}
```

### 路由使用
```typescript
// navigation.component.ts
import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-navigation',
  template: `
    <nav>
      <a routerLink="/home" routerLinkActive="active">Home</a>
      <a routerLink="/about" routerLinkActive="active">About</a>
      <a routerLink="/users" routerLinkActive="active">Users</a>
      <button (click)="goToUser(123)">Go to User 123</button>
    </nav>
    <router-outlet></router-outlet>
  `,
  styles: [`
    nav a {
      margin-right: 10px;
      text-decoration: none;
      color: blue;
    }
    nav a.active {
      font-weight: bold;
      color: red;
    }
  `]
})
export class NavigationComponent {
  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}
  
  goToUser(userId: number): void {
    this.router.navigate(['/users', userId]);
  }
  
  goToUserWithQuery(): void {
    this.router.navigate(['/users'], {
      queryParams: { page: 1, size: 10 },
      fragment: 'top'
    });
  }
}
```

```typescript
// user-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { UserService, User } from '../../services/user.service';

@Component({
  selector: 'app-user-detail',
  template: `
    <div *ngIf="user">
      <h2>{{ user.name }}</h2>
      <p>{{ user.email }}</p>
      <button (click)="editUser()">Edit</button>
      <button (click)="goBack()">Back</button>
    </div>
  `
})
export class UserDetailComponent implements OnInit {
  user: User | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {}
  
  ngOnInit(): void {
    // 获取路由参数
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = Number(params.get('id'));
        return this.userService.getUserById(id);
      })
    ).subscribe(user => {
      this.user = user;
    });
    
    // 获取查询参数
    this.route.queryParams.subscribe(params => {
      console.log('Query params:', params);
    });
  }
  
  editUser(): void {
    if (this.user) {
      this.router.navigate(['edit'], { relativeTo: this.route });
    }
  }
  
  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
```

## 表单处理

### 模板驱动表单
```typescript
// template-form.component.ts
import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-template-form',
  template: `
    <form #userForm="ngForm" (ngSubmit)="onSubmit(userForm)">
      <div>
        <label for="name">Name:</label>
        <input 
          type="text" 
          id="name" 
          name="name" 
          [(ngModel)]="user.name"
          #name="ngModel"
          required
          minlength="2"
        >
        <div *ngIf="name.invalid && name.touched" class="error">
          <div *ngIf="name.errors?.['required']">Name is required</div>
          <div *ngIf="name.errors?.['minlength']">Name must be at least 2 characters</div>
        </div>
      </div>
      
      <div>
        <label for="email">Email:</label>
        <input 
          type="email" 
          id="email" 
          name="email" 
          [(ngModel)]="user.email"
          #email="ngModel"
          required
          email
        >
        <div *ngIf="email.invalid && email.touched" class="error">
          <div *ngIf="email.errors?.['required']">Email is required</div>
          <div *ngIf="email.errors?.['email']">Invalid email format</div>
        </div>
      </div>
      
      <div>
        <label for="age">Age:</label>
        <input 
          type="number" 
          id="age" 
          name="age" 
          [(ngModel)]="user.age"
          #age="ngModel"
          min="18"
          max="100"
        >
        <div *ngIf="age.invalid && age.touched" class="error">
          <div *ngIf="age.errors?.['min']">Age must be at least 18</div>
          <div *ngIf="age.errors?.['max']">Age must be less than 100</div>
        </div>
      </div>
      
      <button type="submit" [disabled]="userForm.invalid">
        Submit
      </button>
    </form>
    
    <div class="debug">
      <h3>Form Debug Info:</h3>
      <p>Form Valid: {{ userForm.valid }}</p>
      <p>Form Value: {{ userForm.value | json }}</p>
    </div>
  `,
  styles: [`
    .error {
      color: red;
      font-size: 12px;
    }
    .debug {
      margin-top: 20px;
      padding: 10px;
      background-color: #f5f5f5;
    }
  `]
})
export class TemplateFormComponent {
  user = {
    name: '',
    email: '',
    age: null
  };
  
  onSubmit(form: NgForm): void {
    if (form.valid) {
      console.log('Form submitted:', this.user);
      // 处理表单提交
    }
  }
}
```

### 响应式表单
```typescript
// reactive-form.component.ts
import { Component, OnInit } from '@angular/core';
import { 
  FormBuilder, 
  FormGroup, 
  FormArray, 
  Validators, 
  AbstractControl 
} from '@angular/forms';

@Component({
  selector: 'app-reactive-form',
  template: `
    <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
      <div>
        <label for="name">Name:</label>
        <input type="text" id="name" formControlName="name">
        <div *ngIf="name?.invalid && name?.touched" class="error">
          <div *ngIf="name?.errors?.['required']">Name is required</div>
          <div *ngIf="name?.errors?.['minlength']">Name must be at least 2 characters</div>
        </div>
      </div>
      
      <div>
        <label for="email">Email:</label>
        <input type="email" id="email" formControlName="email">
        <div *ngIf="email?.invalid && email?.touched" class="error">
          <div *ngIf="email?.errors?.['required']">Email is required</div>
          <div *ngIf="email?.errors?.['email']">Invalid email format</div>
        </div>
      </div>
      
      <div formGroupName="address">
        <h3>Address</h3>
        <div>
          <label for="street">Street:</label>
          <input type="text" id="street" formControlName="street">
        </div>
        <div>
          <label for="city">City:</label>
          <input type="text" id="city" formControlName="city">
        </div>
      </div>
      
      <div>
        <h3>Hobbies</h3>
        <div formArrayName="hobbies">
          <div *ngFor="let hobby of hobbies.controls; let i = index">
            <input type="text" [formControlName]="i">
            <button type="button" (click)="removeHobby(i)">Remove</button>
          </div>
        </div>
        <button type="button" (click)="addHobby()">Add Hobby</button>
      </div>
      
      <button type="submit" [disabled]="userForm.invalid">
        Submit
      </button>
    </form>
    
    <div class="debug">
      <h3>Form Debug Info:</h3>
      <p>Form Valid: {{ userForm.valid }}</p>
      <p>Form Value: {{ userForm.value | json }}</p>
      <p>Form Errors: {{ getFormErrors() | json }}</p>
    </div>
  `,
  styles: [`
    .error {
      color: red;
      font-size: 12px;
    }
    .debug {
      margin-top: 20px;
      padding: 10px;
      background-color: #f5f5f5;
    }
  `]
})
export class ReactiveFormComponent implements OnInit {
  userForm!: FormGroup;
  
  constructor(private fb: FormBuilder) {}
  
  ngOnInit(): void {
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      address: this.fb.group({
        street: [''],
        city: ['', Validators.required]
      }),
      hobbies: this.fb.array([
        this.fb.control('Reading'),
        this.fb.control('Gaming')
      ])
    });
  }
  
  // 获取表单控件的便捷方法
  get name() { return this.userForm.get('name'); }
  get email() { return this.userForm.get('email'); }
  get hobbies() { return this.userForm.get('hobbies') as FormArray; }
  
  addHobby(): void {
    this.hobbies.push(this.fb.control(''));
  }
  
  removeHobby(index: number): void {
    this.hobbies.removeAt(index);
  }
  
  onSubmit(): void {
    if (this.userForm.valid) {
      console.log('Form submitted:', this.userForm.value);
      // 处理表单提交
    } else {
      // 标记所有字段为已触摸，显示验证错误
      this.markFormGroupTouched(this.userForm);
    }
  }
  
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
  
  getFormErrors(): any {
    let errors: any = {};
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      if (control && !control.valid && control.touched) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }
}
```

### 自定义验证器
```typescript
// validators.ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class CustomValidators {
  // 自定义验证器：禁止特定值
  static forbiddenName(forbiddenName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const forbidden = forbiddenName.toLowerCase() === control.value?.toLowerCase();
      return forbidden ? { forbiddenName: { value: control.value } } : null;
    };
  }
  
  // 密码强度验证器
  static strongPassword(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    
    const hasNumber = /[0-9]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasSpecial = /[#?!@$%^&*-]/.test(value);
    const isLengthValid = value.length >= 8;
    
    const passwordValid = hasNumber && hasUpper && hasLower && hasSpecial && isLengthValid;
    
    return passwordValid ? null : {
      strongPassword: {
        hasNumber,
        hasUpper,
        hasLower,
        hasSpecial,
        isLengthValid
      }
    };
  }
  
  // 确认密码验证器
  static passwordMatch(passwordField: string, confirmPasswordField: string): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const password = formGroup.get(passwordField);
      const confirmPassword = formGroup.get(confirmPasswordField);
      
      if (!password || !confirmPassword) {
        return null;
      }
      
      return password.value === confirmPassword.value 
        ? null 
        : { passwordMismatch: true };
    };
  }
}

// 使用自定义验证器
this.userForm = this.fb.group({
  name: ['', [Validators.required, CustomValidators.forbiddenName('admin')]],
  password: ['', [Validators.required, CustomValidators.strongPassword]],
  confirmPassword: ['', Validators.required]
}, {
  validators: CustomValidators.passwordMatch('password', 'confirmPassword')
});
```

## HTTP客户端

### 基本HTTP操作
```typescript
// api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'https://api.example.com';
  
  constructor(private http: HttpClient) {}
  
  // GET请求
  get<T>(endpoint: string, params?: any): Observable<T> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    return this.http.get<T>(`${this.baseUrl}/${endpoint}`, {
      params: httpParams
    }).pipe(
      retry(3),
      catchError(this.handleError)
    );
  }
  
  // POST请求
  post<T>(endpoint: string, data: any): Observable<T> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, data, {
      headers
    }).pipe(
      catchError(this.handleError)
    );
  }
  
  // PUT请求
  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, data).pipe(
      catchError(this.handleError)
    );
  }
  
  // DELETE请求
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${endpoint}`).pipe(
      catchError(this.handleError)
    );
  }
  
  // 文件上传
  uploadFile(endpoint: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post(`${this.baseUrl}/${endpoint}`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      catchError(this.handleError)
    );
  }
  
  // 错误处理
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // 客户端错误
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // 服务器错误
      errorMessage = `Server Error: ${error.status} - ${error.message}`;
    }
    
    console.error('HTTP Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
```

### HTTP拦截器
```typescript
// auth.interceptor.ts
import { Injectable } from '@angular/core';
import { 
  HttpInterceptor, 
  HttpRequest, 
  HttpHandler, 
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // 添加认证头
    const token = this.authService.getToken();
    let authReq = req;
    
    if (token) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Token过期，尝试刷新
          return this.authService.refreshToken().pipe(
            switchMap((newToken: string) => {
              // 使用新token重试请求
              const newAuthReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next.handle(newAuthReq);
            }),
            catchError(() => {
              // 刷新失败，跳转到登录页
              this.authService.logout();
              this.router.navigate(['/login']);
              return throwError(() => error);
            })
          );
        }
        
        return throwError(() => error);
      })
    );
  }
}

// 注册拦截器
// app.module.ts
import { HTTP_INTERCEPTORS } from '@angular/common/http';

@NgModule({
  // ...
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
})
export class AppModule { }
```

## Angular CLI常用命令

### 项目管理
```bash
# 创建新项目
ng new my-app
ng new my-app --routing --style=scss

# 启动开发服务器
ng serve
ng serve --port 4200 --open

# 构建项目
ng build
ng build --prod
ng build --configuration=production

# 运行测试
ng test
ng e2e

# 代码检查
ng lint
```

### 代码生成
```bash
# 生成组件
ng generate component user-list
ng g c user-list --skip-tests

# 生成服务
ng generate service user
ng g s services/user

# 生成模块
ng generate module user --routing
ng g m user --routing

# 生成指令
ng generate directive highlight
ng g d highlight

# 生成管道
ng generate pipe truncate
ng g p truncate

# 生成守卫
ng generate guard auth
ng g g auth

# 生成接口
ng generate interface user
ng g i user

# 生成枚举
ng generate enum user-role
ng g e user-role
```

### 库管理
```bash
# 添加Angular库
ng add @angular/material
ng add @angular/pwa
ng add @ngrx/store

# 更新依赖
ng update
ng update @angular/core @angular/cli

# 分析包大小
ng build --stats-json
npx webpack-bundle-analyzer dist/my-app/stats.json
```

## Angular最佳实践

### 1. 项目结构
```
src/
├── app/
│   ├── core/                    # 核心模块（单例服务、守卫等）
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── services/
│   │   └── core.module.ts
│   ├── shared/                  # 共享模块（组件、指令、管道）
│   │   ├── components/
│   │   ├── directives/
│   │   ├── pipes/
│   │   └── shared.module.ts
│   ├── features/                # 特性模块
│   │   ├── user/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   ├── user-routing.module.ts
│   │   │   └── user.module.ts
│   │   └── product/
│   ├── layout/                  # 布局组件
│   │   ├── header/
│   │   ├── footer/
│   │   └── sidebar/
│   ├── app-routing.module.ts
│   ├── app.component.ts
│   └── app.module.ts
├── assets/                      # 静态资源
├── environments/                # 环境配置
└── styles/                      # 全局样式
    ├── _variables.scss
    ├── _mixins.scss
    └── styles.scss
```

### 2. 组件设计原则
```typescript
// 好的组件设计
@Component({
  selector: 'app-user-card',
  templateUrl: './user-card.component.html',
  styleUrls: ['./user-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush // 性能优化
})
export class UserCardComponent implements OnInit, OnDestroy {
  @Input() user!: User;
  @Input() showActions = true;
  @Output() userClick = new EventEmitter<User>();
  @Output() deleteUser = new EventEmitter<number>();
  
  private destroy$ = new Subject<void>();
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    // 初始化逻辑
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  onUserClick(): void {
    this.userClick.emit(this.user);
  }
  
  onDeleteClick(event: Event): void {
    event.stopPropagation();
    this.deleteUser.emit(this.user.id);
  }
}
```

### 3. 性能优化
```typescript
// 使用OnPush变更检测策略
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptimizedComponent {
  @Input() data: any;
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  updateData(): void {
    // 手动触发变更检测
    this.cdr.markForCheck();
  }
}

// 使用TrackBy函数优化ngFor
@Component({
  template: `
    <div *ngFor="let item of items; trackBy: trackByFn">
      {{ item.name }}
    </div>
  `
})
export class ListComponent {
  items: any[] = [];
  
  trackByFn(index: number, item: any): any {
    return item.id; // 使用唯一标识符
  }
}

// 懒加载模块
const routes: Routes = [
  {
    path: 'users',
    loadChildren: () => import('./user/user.module').then(m => m.UserModule)
  }
];
```

### 4. 状态管理
```typescript
// 使用RxJS进行状态管理
@Injectable({
  providedIn: 'root'
})
export class StateService {
  private stateSubject = new BehaviorSubject(initialState);
  public state$ = this.stateSubject.asObservable();
  
  updateState(newState: Partial<State>): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({ ...currentState, ...newState });
  }
  
  getState(): State {
    return this.stateSubject.value;
  }
}
```

## Angular生态系统

### UI组件库
- **Angular Material**：官方Material Design组件库
- **Ant Design Angular**：企业级UI组件库
- **PrimeNG**：丰富的UI组件集合
- **Clarity**：VMware开源的设计系统
- **Ionic**：移动端UI组件库

### 状态管理
- **NgRx**：基于Redux的状态管理
- **Akita**：简单的状态管理解决方案
- **NGXS**：基于CQRS的状态管理

### 工具和库
- **Angular DevTools**：浏览器调试扩展
- **Compodoc**：文档生成工具
- **Angular ESLint**：代码质量工具
- **Jest**：测试框架
- **Cypress**：端到端测试

## 总结

Angular是一个功能完整、企业级的前端框架，具有以下特点：

### 优势
- **TypeScript支持**：强类型检查，更好的开发体验
- **完整的解决方案**：包含路由、HTTP、表单等所有功能
- **企业级特性**：依赖注入、模块化、测试支持
- **强大的CLI**：代码生成、构建优化
- **长期支持**：Google维护，版本稳定

### 适用场景
- **大型企业应用**：复杂的业务逻辑
- **团队协作**：统一的开发规范
- **长期维护项目**：稳定的架构
- **TypeScript项目**：原生支持

### 学习建议
1. **掌握TypeScript**：Angular的基础
2. **理解核心概念**：组件、服务、模块、依赖注入
3. **学习RxJS**：响应式编程
4. **掌握Angular CLI**：提高开发效率
5. **实践项目**：构建完整应用
6. **学习最佳实践**：代码组织、性能优化

Angular适合构建大型、复杂的Web应用，特别是在企业环境中，其完整的工具链和严格的架构能够确保项目的可维护性和可扩展性。