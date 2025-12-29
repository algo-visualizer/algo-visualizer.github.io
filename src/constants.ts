export const INITIAL_CODE_1 = `from visual import *

# Click the gutter on the left to add breakpoints (red dots)
# Then click "Visualize" below.
# You can also manually call breakpoint() in your code.
# You can use var('var_name'), array('iterable_name'), etc. to track variables. 

array('nums').index('i', 'n').index('i-1', 'i-2', expr=True)
array('dp').index('i', 'n').index('i-1', 'i-2', expr=True)

def rob(nums: list[int])-> int:
    n = len(nums)
    dp = [0] * (n + 1)
    dp[1] = nums[0]
    for i in range(2, n + 1):
        dp[i] = max(dp[i- 1], nums[i- 1] + dp[i- 2])
    return dp[n]

rob([2, 7, 9, 3, 1]) # Expected output: 12
`;

export const INITIAL_CODE_2 = `from visual import *

nodes('l').index('i', 'j').item('target')
breakpoint()

l = [1,2,0]
breakpoint()

l[2] = None
breakpoint()

i, j = 0, 1
breakpoint()

target = 2
breakpoint()
`;

export const INITIAL_CODE_3 = `from visual import *

_nodes: dict[int, 'Node'] = {}

def get_children_keys(key):
    node = _nodes.get(key)
    if node is None: return [None, None]
    leftkey, rightkey = node.left.key if node.left else None, node.right.key if node.right else None
    return [(leftkey, "l"), (rightkey, "r")]

def get_value(key):
    return _nodes.get(key)

class Node:
    def __init__(self, key):
        self.key, self.height = key, 1
        self.left, self.right = None, None
        global _nodes
        _nodes[self.key] = self

class AVLTree:
    def __init__(self): self.root = None
    def height(self, node): return 0 if not node else node.height
    def balance(self, node): return 0 if not node else self.height(node.left) - self.height(node.right)
    def update_height(self, node): node.height = 1 + max(self.height(node.left), self.height(node.right))

    def rotate_left(self, z):
        with inherit('avl').item('y', 'z', 'T2'):
            y = z.right
            breakpoint()
            T2 = y.left
            breakpoint()
            y.left = z
            breakpoint()
            z.right = T2
            breakpoint()
        self.update_height(z)
        self.update_height(y)
        return y

    def rotate_right(self, z):
        with inherit('avl').item('y', 'z', 'T2'):
            y = z.left
            breakpoint()
            T2 = y.right
            breakpoint()
            y.right = z
            breakpoint()
            z.left = T2
            breakpoint()
        self.update_height(z)
        self.update_height(y)
        return y

    def insert(self, root, key):
        if not root: return Node(key)
        elif key < root.key: root.left = self.insert(root.left, key)
        else: root.right = self.insert(root.right, key)
        self.update_height(root)

        with var('balance'):
            balance = self.balance(root)
            if balance > 1 and key < root.left.key:
                breakpoint()
                node = self.rotate_right(root)
                breakpoint()
                return node
            if balance < -1 and key > root.right.key:
                breakpoint()
                node = self.rotate_left(root)
                breakpoint()
                return node
            if balance > 1 and key > root.left.key:
                breakpoint()
                root.left = self.rotate_left(root.left)
                breakpoint()
                node = self.rotate_right(root)
                breakpoint()
                return node
            if balance < -1 and key < root.right.key:
                breakpoint()
                root.right = self.rotate_right(root.right)
                breakpoint()
                node = self.rotate_left(root)
                breakpoint()
                return node
        return root
        
    def insert_key(self, key):
        self.root = self.insert(self.root, key)

nodes('avl', 
    lambda avl: avl.root.key if avl.root else None,
    lambda _, key: get_children_keys(key),
    lambda _, key: get_value(key),
).item('avl.root', expr=True)

avl = AVLTree()
keys = [10, 20, 30, 40, 50, 25]

for key in keys:
    avl.insert_key(key)

breakpoint()
`;

export const INITIAL_CODE_4 = `from micrograd.nn import MLP
from visual import *

array('[round(p.data, 2) for p in n.parameters()]', expr=True)

# 定义一个 MLP：
# 输入维度为 3
# 两个隐藏层，每层 4 个神经元
# 输出维度为 1
n = MLP(3, [4, 4, 1])

xs = [
  [2.0, 3.0, -1.0],
  [3.0, -1.0, 0.5],
  [0.5, 1.0, 1.0],
  [1.0, 1.0, -1.0],
]
ys = [1.0, -1.0, -1.0, 1.0] # 目标标签

for k in range(100):

    breakpoint('k % 5 == 0')
    
    # 1. 前向传播 (Forward pass)
    ypred = [n(x) for x in xs]
    # 计算均方误差损失 (L2 Loss)
    loss = sum((yout - ygt)**2 for ygt, yout in zip(ys, ypred))
    
    # 2. 清空梯度 (Zero grad)
    n.zero_grad()
    
    # 3. 反向传播 (Backward pass)
    loss.backward()

    import micrograd
    
    # 4. 更新权重 (Update/Stochastic Gradient Descent)
    for p in n.parameters():
        p.data += -0.01 * p.grad
    
    print(f"Step {k}, loss: {loss.data:.4f}")

print('------------ TEST --------------')

test_xs = [
    [1.0, 1.0, 1.0],
    [-1.0, -1.0, 0.0],
    [2.0, 3.0, -1.0],
]

results = [n(x).data for x in test_xs]
print(results)
`;

export default INITIAL_CODE_3;
